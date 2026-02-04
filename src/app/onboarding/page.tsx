"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeyContext } from "@/context/KeyContext";
import { useSupabaseAuth } from "@/context/SupabaseAuthProvider";

export default function OnboardingPage() {
  const router = useRouter();
  const { hasIdentity, initializeIdentity } = useKeyContext();
  const { authReady } = useSupabaseAuth();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (hasIdentity) {
    router.replace("/chat");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!authReady) {
      setError("Secure session is still initializing. Please wait a moment.");
      return;
    }

    if (!passphrase || passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }

    if (passphrase !== confirm) {
      setError("Passphrases do not match.");
      return;
    }

    try {
      setLoading(true);
      await initializeIdentity(passphrase);
      router.replace("/chat");
    } catch (err) {
      console.error(err);
      setError("Failed to initialize identity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl shadow-black/40">
        <header className="space-y-2 border-b border-zinc-800 pb-4 mb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
            Ghost Network
          </p>
          <h1 className="text-xl font-semibold text-zinc-100">
            This is not WhatsApp.
          </h1>
          <p className="text-sm text-zinc-400">
            Ghost Network leaves no trace. If you lose your key, your data is
            gone forever. This app can be used for illegal acts. You alone bear
            responsibility.
          </p>
        </header>

        <section className="space-y-3 mb-4 text-sm text-zinc-400">
          <p className="font-medium text-zinc-200">
            Before you continue, you must choose a passphrase.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Your device will generate a local cryptographic identity
              (Ed25519).
            </li>
            <li>Your private key is encrypted with this passphrase.</li>
            <li>There are no backups, resets, or recovery links.</li>
            <li>
              Losing this passphrase or wiping this device destroys your account
              and all messages.
            </li>
          </ul>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-200">
              Passphrase
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-200">
              Confirm passphrase
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !authReady}
            className="w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authReady
              ? loading
                ? "Generating keys..."
                : "I understand. Generate my key."
              : "Initializing secure session…"}
          </button>

          <p className="text-[11px] leading-snug text-zinc-500">
            By continuing you acknowledge that there is no account recovery and
            that no one, including the creators of this software, can restore
            your data.
          </p>
        </form>
      </div>
    </div>
  );
}


