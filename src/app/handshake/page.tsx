"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useKeyContext } from "@/context/KeyContext";
import {
  deriveSessionKeyFromBox,
  loadEncryptedBoxSecretKeyFromStorage,
  decryptBoxSecretKey,
} from "@/lib/crypto";
import { useToast } from "@/components/Toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { validateTokenId } from "@/lib/validation";

import { useSupabaseAuth } from "@/context/SupabaseAuthProvider";

interface PendingHandshake {
  id: string;
  initiator_id: string;
  target_token_id: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
}

export default function HandshakePage() {
  const router = useRouter();
  const { tokenId, publicKey, boxPublicKey, encryptedBoxSecretKey } = useKeyContext();
  const { user } = useSupabaseAuth();
  const { addToast } = useToast();
  const [targetToken, setTargetToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingHandshake[]>([]);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [handshakeToAccept, setHandshakeToAccept] = useState<PendingHandshake | null>(null);

  useEffect(() => {
    if (!tokenId) return;
    async function loadPending() {
      const { data, error } = await supabase
        .from("handshakes")
        .select("id, initiator_id, target_token_id, status, created_at")
        .eq("target_token_id", tokenId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        setError("Failed to load pending handshakes.");
        return;
      }
      setPending(data as PendingHandshake[]);
    }
    loadPending();
  }, [tokenId]);

  async function handleInitiate(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate token format
    const validation = validateTokenId(targetToken);
    if (!validation.valid) {
      setError(validation.error || "Invalid token format");
      return;
    }

    setSubmitting(true);
    try {
      // Use cached user if available to save a round trip
      let initiatorUser = user;
      if (!initiatorUser) {
        const { data: auth } = await supabase.auth.getUser();
        initiatorUser = auth.user;
      }

      if (!initiatorUser) {
        throw new Error("No authenticated user for handshake initiator.");
      }

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("handshakes").insert({
        initiator_id: initiatorUser.id,
        target_token_id: targetToken.trim(),
        expires_at: expiresAt,
      });
      if (error) {
        throw new Error(error.message);
      }
      setTargetToken("");
      addToast("Handshake request sent successfully", "success");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create handshake.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function promptForPassphrase(h: PendingHandshake) {
    setHandshakeToAccept(h);
    setShowPassphraseModal(true);
    setPassphrase("");
  }

  async function handleAcceptWithPassphrase() {
    if (!handshakeToAccept || !passphrase) {
      setError("Please enter your passphrase.");
      return;
    }

    const h = handshakeToAccept;
    setShowPassphraseModal(false);
    setError(null);

    try {
      // Decrypt our box secret key
      const encBoxKey = encryptedBoxSecretKey || loadEncryptedBoxSecretKeyFromStorage();
      if (!encBoxKey) {
        throw new Error("No encrypted box key found in storage.");
      }
      const myBoxSecretKey = await decryptBoxSecretKey(encBoxKey, passphrase);

      // Parallelize lookups for speed
      const [selfResult, initiatorResult] = await Promise.all([
        supabase.from("users").select("id, public_key, box_public_key").single(),
        supabase.from("users").select("id, public_key, box_public_key").eq("id", h.initiator_id).single(),
      ]);

      const { data: selfUser, error: selfErr } = selfResult;
      if (selfErr || !selfUser) throw selfErr;

      const { data: initiatorUser, error: initErr } = initiatorResult;

      if (initErr || !initiatorUser) {
        throw new Error("Initiator identity not found. The other device must reload the app to sync its identity.");
      }

      if (!initiatorUser.box_public_key) {
        throw new Error("Initiator has no encryption key. They may need to re-onboard with the latest app version.");
      }

      // Derive session key using proper ECDH
      const sessionKey = deriveSessionKeyFromBox(myBoxSecretKey, initiatorUser.box_public_key);
      const sessionKeyBase64 = Buffer.from(sessionKey).toString("base64");

      // Use RPC to atomically create contacts and update handshake (bypasses RLS)
      const { error: rpcError } = await supabase.rpc("accept_handshake", {
        p_handshake_id: h.id,
        p_session_key_material: sessionKeyBase64,
      });

      if (rpcError) throw rpcError;

      setPending((prev) => prev.filter((p) => p.id !== h.id));
      addToast("Handshake accepted successfully!", "success");
      router.replace("/chat");
    } catch (err: unknown) {
      console.error("Handshake accept error:", err);
      let msg = "Failed to accept handshake.";
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === "object" && err !== null) {
        msg = (err as { message?: string }).message || JSON.stringify(err);
      }
      setError(msg);
      addToast(msg, "error");
    }
  }

  async function handleReject(h: PendingHandshake) {
    setError(null);
    try {
      const { error } = await supabase
        .from("handshakes")
        .update({ status: "rejected" })
        .eq("id", h.id);
      if (error) throw error;
      setPending((prev) => prev.filter((p) => p.id !== h.id));
    } catch (err) {
      console.error(err);
      setError("Failed to reject handshake.");
    }
  }

  return (
    <div className="flex min-h-screen bg-black text-zinc-100">
      <div className="m-auto w-full max-w-4xl grid gap-8 md:grid-cols-2 px-4">
        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
              Start handshake
            </p>
            <h1 className="text-lg font-semibold">Scan or enter a Token ID</h1>
            <p className="text-xs text-zinc-500">
              In the full app this would use a camera-based QR scanner. For this
              prototype, paste a Token ID shared with you.
            </p>
          </header>
          <form onSubmit={handleInitiate} className="space-y-3">
            <input
              type="text"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono tracking-[0.25em] outline-none focus:border-zinc-500"
              placeholder="XXXX-XXXX-XXXX"
              value={targetToken}
              onChange={(e) => setTargetToken(e.target.value.toUpperCase())}
              aria-label="Target Token ID"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-label="Request connection"
            >
              {submitting && <LoadingSpinner size="sm" />}
              {submitting ? "Creating handshake..." : "Request connection"}
            </button>
          </form>
          <p className="text-[11px] text-zinc-500">
            No discovery. No directory. Only devices that know each other&apos;s
            Token ID can connect.
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5">
          <header className="space-y-1">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
              Incoming
            </p>
            <h2 className="text-lg font-semibold">Pending handshakes</h2>
            <p className="text-xs text-zinc-500">
              Only devices that already know your Token ID can appear here.
            </p>
          </header>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {pending.length === 0 && (
              <p className="text-sm text-zinc-500">
                No pending handshakes. Share your Token ID to connect with
                another device.
              </p>
            )}
            {pending.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2"
              >
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400">
                    From:&nbsp;
                    <span className="font-mono text-[11px] text-zinc-300">
                      {h.initiator_id.slice(0, 8)}…
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Target: {h.target_token_id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => promptForPassphrase(h)}
                    className="rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-black hover:bg-zinc-200"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(h)}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-zinc-500">
            Your Token ID:&nbsp;
            <span className="font-mono">
              {tokenId ?? "…"} ({publicKey ? "ready" : "no key"})
            </span>
          </p>
        </section>
      </div>

      {/* Passphrase Modal */}
      {showPassphraseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100">Enter Passphrase</h3>
            <p className="text-xs text-zinc-500">
              Your passphrase is required to decrypt your private key and complete the handshake.
            </p>
            <input
              type="password"
              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-500"
              placeholder="Your passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAcceptWithPassphrase();
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleAcceptWithPassphrase}
                className="flex-1 rounded-md bg-zinc-100 py-2 text-sm font-medium text-black hover:bg-zinc-200"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowPassphraseModal(false)}
                className="flex-1 rounded-md border border-zinc-700 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
