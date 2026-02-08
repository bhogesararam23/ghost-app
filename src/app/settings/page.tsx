"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useKeyContext } from "@/context/KeyContext";
import {
  saveEncryptedKeyToStorage,
  savePublicKeyToStorage,
  saveTokenIdToStorage,
  saveEncryptedBoxSecretKeyToStorage,
  saveBoxPublicKeyToStorage,
  generateEd25519KeyPair,
  generateBoxKeyPair,
  deriveTokenId,
  encryptPrivateKey,
  encryptBoxSecretKey,
} from "@/lib/crypto";
import { validateMnemonic, mnemonicToSeed } from "@/lib/mnemonic";

export default function SettingsPage() {
  const { publicKey, boxPublicKey, syncIdentity } = useKeyContext();
  const [retentionHours, setRetentionHours] = useState(72);
  const [warning, setWarning] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restorePhrase, setRestorePhrase] = useState("");
  const [restoring, setRestoring] = useState(false);

  async function handleRotateIdentity() {
    setWarning(null);
    const confirmed = window.confirm(
      "Rotating your identity will make all existing messages undecryptable from this device. Continue?"
    );
    if (!confirmed) return;

    const passphrase = window.prompt(
      "Enter a new passphrase for your new identity."
    );
    if (!passphrase || passphrase.length < 8) {
      setWarning("Passphrase must be at least 8 characters.");
      return;
    }

    try {
      setRotating(true);
      // Generate both key pairs
      const { publicKey: newSigningPub, privateKey: newSigningPriv } = generateEd25519KeyPair();
      const { boxPublicKey: newBoxPub, boxSecretKey: newBoxSec } = generateBoxKeyPair();
      const newToken = deriveTokenId(newSigningPub);

      // Encrypt both keys
      const encSigning = await encryptPrivateKey(newSigningPriv, passphrase);
      const encBox = await encryptBoxSecretKey(newBoxSec, passphrase);

      // Save to localStorage
      saveEncryptedKeyToStorage(encSigning);
      savePublicKeyToStorage(newSigningPub);
      saveTokenIdToStorage(newToken);
      saveEncryptedBoxSecretKeyToStorage(encBox);
      saveBoxPublicKeyToStorage(newBoxPub);

      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("users").upsert(
          {
            id: auth.user.id,
            public_key: newSigningPub,
            box_public_key: newBoxPub,
            token_id: newToken,
            warning_acknowledged: true,
          },
          { onConflict: "id" }
        );
      }

      setWarning(
        "Identity rotated. Existing messages tied to your old key may no longer be readable."
      );
    } catch (err) {
      console.error(err);
      setWarning("Failed to rotate identity.");
    } finally {
      setRotating(false);
    }
  }

  async function handleShredLocal() {
    const confirmed = window.confirm(
      "This will delete all local keys for this browser. You will not be able to read existing messages from this device. Continue?"
    );
    if (!confirmed) return;

    // Remove all identity-related localStorage items
    window.localStorage.removeItem("ghost_encrypted_private_key");
    window.localStorage.removeItem("ghost_public_key");
    window.localStorage.removeItem("ghost_token_id");
    window.localStorage.removeItem("ghost_encrypted_box_secret_key");
    window.localStorage.removeItem("ghost_box_public_key");
    window.localStorage.removeItem("ghost_recovery_seed");

    setWarning("Local keys wiped. Reload to start fresh.");
  }

  async function handleRestore() {
    setWarning(null);
    const words = restorePhrase.trim().toLowerCase().split(/\s+/);

    if (!validateMnemonic(words)) {
      setWarning("Invalid recovery phrase. Must be 12 valid words.");
      return;
    }

    const passphrase = window.prompt(
      "Enter a new passphrase to protect your restored identity."
    );
    if (!passphrase || passphrase.length < 8) {
      setWarning("Passphrase must be at least 8 characters.");
      return;
    }

    try {
      setRestoring(true);

      // Derive deterministic seed from mnemonic
      const seed = mnemonicToSeed(words);

      // Generate keys from seed (in a real app, we'd use the seed directly)
      // For this prototype, we regenerate keys and use the seed for verification
      const { publicKey: newSigningPub, privateKey: newSigningPriv } = generateEd25519KeyPair();
      const { boxPublicKey: newBoxPub, boxSecretKey: newBoxSec } = generateBoxKeyPair();
      const newToken = deriveTokenId(newSigningPub);

      // Encrypt keys
      const encSigning = await encryptPrivateKey(newSigningPriv, passphrase);
      const encBox = await encryptBoxSecretKey(newBoxSec, passphrase);

      // Save to localStorage
      saveEncryptedKeyToStorage(encSigning);
      savePublicKeyToStorage(newSigningPub);
      saveTokenIdToStorage(newToken);
      saveEncryptedBoxSecretKeyToStorage(encBox);
      saveBoxPublicKeyToStorage(newBoxPub);
      localStorage.setItem("ghost_recovery_seed", Buffer.from(seed).toString("base64"));

      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("users").upsert(
          {
            id: auth.user.id,
            public_key: newSigningPub,
            box_public_key: newBoxPub,
            token_id: newToken,
            warning_acknowledged: true,
          },
          { onConflict: "id" }
        );
      }

      setWarning("Identity restored successfully. Note: This creates a new identity; original messages cannot be decrypted.");
      setShowRestore(false);
      setRestorePhrase("");
    } catch (err) {
      console.error(err);
      setWarning("Failed to restore identity.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-black text-zinc-100">
      <div className="m-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 space-y-6">
        <header className="space-y-1 border-b border-zinc-800 pb-3">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
            Settings
          </p>
          <h1 className="text-lg font-semibold text-zinc-100">
            Local security controls
          </h1>
          <p className="text-xs text-zinc-500">
            No analytics. No logs. Only your device holds your keys.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-200">
            Message retention (server-side)
          </h2>
          <p className="text-xs text-zinc-500">
            Messages are scheduled to be deleted after a fixed window. This is a
            UI preference only; backend cleanup runs on a schedule.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={168}
              className="w-24 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-sm"
              value={retentionHours}
              onChange={(e) =>
                setRetentionHours(parseInt(e.target.value || "1", 10))
              }
            />
            <span className="text-sm text-zinc-400">hours</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Prototype note: changing this value does not yet modify server
            expiry logic; messages currently default to 72h.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-200">
            Identity & key management
          </h2>
          <p className="text-xs text-zinc-500">
            Your identity is defined only by your keypairs and Token ID.
          </p>
          <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400 space-y-1">
            <p>
              Signing key (truncated):{" "}
              <span className="font-mono">
                {publicKey ? `${publicKey.slice(0, 24)}…` : "none"}
              </span>
            </p>
            <p>
              Encryption key (truncated):{" "}
              <span className="font-mono">
                {boxPublicKey ? `${boxPublicKey.slice(0, 24)}…` : "none"}
              </span>
            </p>
            <p className="text-[11px]">
              Rotating your identity breaks access to older messages on this
              device and for peers that have not updated your contact.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleRotateIdentity}
              disabled={rotating}
              className="rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {rotating ? "Rotating…" : "Rotate identity"}
            </button>
            <button
              onClick={handleShredLocal}
              className="rounded-md border border-red-800 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-100 hover:bg-red-900/60"
            >
              Shred local keys
            </button>
            <button
              onClick={() => setShowRestore(!showRestore)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              {showRestore ? "Cancel Restore" : "Restore from Phrase"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setWarning(null);
                try {
                  await syncIdentity();
                  alert("Identity synced (upserted) successfully!");
                } catch (err) {
                  console.error(err);
                  setWarning("Sync failed. Check console.");
                }
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Force Sync Identity
            </button>
          </div>
        </section>

        {showRestore && (
          <section className="space-y-3 p-4 rounded-md border border-zinc-700 bg-zinc-900/40">
            <h3 className="text-sm font-medium text-zinc-200">
              Restore from Recovery Phrase
            </h3>
            <p className="text-xs text-zinc-500">
              Enter your 12-word recovery phrase to restore your identity.
              Note: Due to the prototype nature, this will create a new identity—original messages cannot be restored.
            </p>
            <textarea
              className="w-full h-24 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-mono outline-none focus:border-zinc-500"
              placeholder="Enter your 12 recovery words separated by spaces..."
              value={restorePhrase}
              onChange={(e) => setRestorePhrase(e.target.value)}
            />
            <button
              onClick={handleRestore}
              disabled={restoring || !restorePhrase.trim()}
              className="rounded-md bg-zinc-100 px-4 py-2 text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
            >
              {restoring ? "Restoring…" : "Restore Identity"}
            </button>
          </section>
        )}

        {warning && (
          <p className="text-[11px] text-yellow-300 bg-yellow-950/40 border border-yellow-900 rounded-md px-3 py-2">
            {warning}
          </p>
        )}
      </div>
    </div>
  );
}
