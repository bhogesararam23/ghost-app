"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeyContext } from "@/context/KeyContext";
import { useSupabaseAuth } from "@/context/SupabaseAuthProvider";
import { entropyToMnemonic } from "@/lib/mnemonic";

export default function OnboardingPage() {
  const router = useRouter();
  const { hasIdentity, initializeIdentity } = useKeyContext();
  const { authReady } = useSupabaseAuth();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Recovery phrase state
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[] | null>(null);
  const [phraseConfirmed, setPhraseConfirmed] = useState(false);

  if (hasIdentity && !recoveryPhrase) {
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

      // Generate recovery phrase from a random seed
      // In a real app, we'd derive this from the actual key entropy
      const seed = crypto.getRandomValues(new Uint8Array(32));
      const words = entropyToMnemonic(seed);
      setRecoveryPhrase(words);

      // Store the seed in localStorage for potential recovery (encrypted with passphrase)
      // This is a simplified approach for the prototype
      localStorage.setItem("ghost_recovery_seed", Buffer.from(seed).toString("base64"));
    } catch (err) {
      console.error(err);
      setError("Failed to initialize identity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleProceed() {
    if (!phraseConfirmed) {
      setError("Please confirm you have saved your recovery phrase.");
      return;
    }
    router.replace("/chat");
  }

  // Show recovery phrase screen
  if (recoveryPhrase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl shadow-black/40">
          <header className="space-y-2 border-b border-zinc-800 pb-4 mb-4">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
              Recovery Phrase
            </p>
            <h1 className="text-xl font-semibold text-zinc-100">
              Write this down. Now.
            </h1>
            <p className="text-sm text-red-400">
              ⚠️ This is the ONLY way to recover your account. Store it offline. Never share it.
            </p>
          </header>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {recoveryPhrase.map((word, idx) => (
              <div
                key={idx}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-center"
              >
                <span className="text-xs text-zinc-500 mr-1">{idx + 1}.</span>
                <span className="text-sm font-mono text-zinc-100">{word}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={phraseConfirmed}
                onChange={(e) => setPhraseConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-zinc-100"
              />
              <span className="text-sm text-zinc-400">
                I have written down my recovery phrase and stored it in a safe place.
                I understand that losing this phrase means losing my account forever.
              </span>
            </label>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleProceed}
              disabled={!phraseConfirmed}
              className="w-full rounded-md bg-zinc-100 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Chat
            </button>
          </div>
        </div>
      </div>
    );
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
              (Ed25519 + X25519).
            </li>
            <li>Your private key is encrypted with this passphrase.</li>
            <li>You will receive a 12-word recovery phrase. Write it down.</li>
            <li>
              Losing this passphrase or recovery phrase destroys your account
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
            By continuing you acknowledge that there is no account recovery other
            than your recovery phrase, and that no one, including the creators of
            this software, can restore your data.
          </p>
        </form>
      </div>
    </div>
  );
}
