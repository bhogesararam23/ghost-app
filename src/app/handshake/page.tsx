"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useKeyContext } from "@/context/KeyContext";
import { deriveSessionKey } from "@/lib/crypto";

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
  const { tokenId, publicKey } = useKeyContext();
  const { user } = useSupabaseAuth(); // Use cached user
  const [targetToken, setTargetToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingHandshake[]>([]);

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
    if (!targetToken || targetToken.length < 4) {
      setError("Enter a valid Token ID from another device.");
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
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create handshake.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept(h: PendingHandshake) {
    setError(null);
    try {
      // Parallelize lookups for speed
      const [selfResult, initiatorResult] = await Promise.all([
        supabase.from("users").select("id, public_key").single(),
        supabase.from("users").select("id, public_key").eq("id", h.initiator_id).single(),
      ]);

      const { data: selfUser, error: selfErr } = selfResult;
      if (selfErr || !selfUser) throw selfErr;

      const { data: initiatorUser, error: initErr } = initiatorResult;

      if (initErr || !initiatorUser) {
        throw new Error("Initiator identity not found. The other device must reload the app to sync its identity.");
      }

      const sessionKey = deriveSessionKey(
        selfUser.public_key,
        initiatorUser.public_key
      );
      const sessionKeyBase64 = Buffer.from(sessionKey).toString("base64");

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/09257254-ad20-4bdc-a801-8c5fc08b2906",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H3",
            location: "handshake/page.tsx:handleAccept",
            message: "Derived session key and inserting contacts",
            data: {
              selfId: selfUser.id,
              initiatorId: initiatorUser.id,
              handshakeId: h.id,
            },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => { });
      // #endregion

      // Use RPC to atomcially create contacts and update handshake (bypasses RLS)
      const { error: rpcError } = await supabase.rpc("accept_handshake", {
        p_handshake_id: h.id,
        p_session_key_material: sessionKeyBase64,
      });

      if (rpcError) throw rpcError;

      setPending((prev) => prev.filter((p) => p.id !== h.id));
      router.replace("/chat");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to accept handshake.";
      setError(msg);
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
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
                    onClick={() => handleAccept(h)}
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
    </div>
  );
}


