"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseAuth } from "./SupabaseAuthProvider";
import {
  EncryptedPrivateKey,
  generateEd25519KeyPair,
  saveEncryptedKeyToStorage,
  savePublicKeyToStorage,
  saveTokenIdToStorage,
  loadEncryptedKeyFromStorage,
  loadPublicKeyFromStorage,
  loadTokenIdFromStorage,
  deriveTokenId,
} from "@/lib/crypto";

interface KeyContextValue {
  publicKey: string | null;
  tokenId: string | null;
  encryptedPrivateKey: EncryptedPrivateKey | null;
  isInitialized: boolean;
  hasIdentity: boolean;
  initializeIdentity: (passphrase: string) => Promise<void>;
  syncIdentity: () => Promise<void>;
}

const KeyContext = createContext<KeyContextValue | undefined>(undefined);

export function KeyProvider({ children }: { children: React.ReactNode }) {
  // Hydration fix: Initialize state to null (server-safe)
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [encryptedPrivateKey, setEncryptedPrivateKey] =
    useState<EncryptedPrivateKey | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const hasIdentity = !!(publicKey && tokenId && encryptedPrivateKey);
  const { authReady, user, session } = useSupabaseAuth();

  // Load keys from storage on mount
  useEffect(() => {
    setPublicKey(loadPublicKeyFromStorage());
    setTokenId(loadTokenIdFromStorage());
    setEncryptedPrivateKey(loadEncryptedKeyFromStorage());
    setIsInitialized(true);
  }, []);

  const syncIdentity = async () => {
    if (!authReady || !hasIdentity || !publicKey || !tokenId) return;

    // Use cached user if available, otherwise fetch
    let currentUser = user;
    if (!currentUser) {
      const { data } = await supabase.auth.getUser();
      currentUser = data.user;
    }

    if (!currentUser) {
      // eslint-disable-next-line no-console
      console.warn("No auth user found during sync.");
      return;
    }

    // eslint-disable-next-line no-console
    console.log("Syncing identity for user...");

    const { error } = await supabase.from("users").upsert(
      {
        id: currentUser.id,
        public_key: publicKey,
        token_id: tokenId,
        warning_acknowledged: true,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Failed to sync identity:", error);
      throw error;
    } else {
      // eslint-disable-next-line no-console
      console.log("Identity synced successfully.");
    }
  };

  // Self-healing: Ensure the user row exists in Supabase if we have a local identity.
  // Optimization: Check existence (Read) before writing to avoid unnecessary upserts.
  useEffect(() => {
    async function checkAndSync() {
      if (!authReady || !hasIdentity || !user || !publicKey) return;

      // Check if user exists with correct public key
      const { data, error } = await supabase
        .from("users")
        .select("public_key")
        .eq("id", user.id)
        .single();

      // If user missing or key mismatch, sync.
      // We use 'upsert' in syncIdentity which handles creation.
      if (error || !data || data.public_key !== publicKey) {
        console.log("User missing or key mismatch on server, syncing...");
        syncIdentity().catch((err) => console.error("Auto-sync failed:", err));
      }
    }

    if (authReady && hasIdentity) {
      checkAndSync();
    }
  }, [authReady, hasIdentity, user]);

  const initializeIdentity = async (passphrase: string) => {
    let currentUser = user;

    // Fallback if context user isn't ready yet (edge case) or missing
    if (!currentUser) {
      const { data: authData } = await supabase.auth.getUser();
      currentUser = authData.user;
    }

    if (!currentUser) {
      // Fallback: try to create an anonymous session on-demand.
      const { data: anonData, error: anonError } =
        await supabase.auth.signInAnonymously();

      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/09257254-ad20-4bdc-a801-8c5fc08b2906",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H2",
            location: "KeyContext.tsx:initializeIdentity",
            message: "Attempted signInAnonymously in initializeIdentity",
            data: { hasUserAfter: !!anonData?.user, hasError: !!anonError },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => { });
      // #endregion

      if (anonError || !anonData?.user) {
        throw new Error("No Supabase auth user; ensure auth session is created.");
      }
      currentUser = anonData.user;
    }

    const { publicKey: pub, privateKey } = generateEd25519KeyPair();
    const token = deriveTokenId(pub);
    const enc = await encryptAndPersist(privateKey, passphrase, pub, token);

    // Upsert into Supabase users table
    const { error } = await supabase.from("users").upsert(
      {
        id: currentUser.id,
        public_key: pub,
        token_id: token,
        warning_acknowledged: true,
      },
      { onConflict: "id" }
    );

    if (error) {
      // #region agent log
      fetch(
        "http://127.0.0.1:7242/ingest/09257254-ad20-4bdc-a801-8c5fc08b2906",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H2",
            location: "KeyContext.tsx:initializeIdentity",
            message: "Supabase users upsert failed",
            data: { error: error.message },
            timestamp: Date.now(),
          }),
        }
      ).catch(() => { });
      // #endregion
      throw error;
    }

    setPublicKey(pub);
    setTokenId(token);
    setEncryptedPrivateKey(enc);
  };

  return (
    <KeyContext.Provider
      value={{
        publicKey,
        tokenId,
        encryptedPrivateKey,
        isInitialized,
        hasIdentity,
        initializeIdentity,
        syncIdentity,
      }}
    >
      {children}
    </KeyContext.Provider>
  );
}

async function encryptAndPersist(
  privateKeyBase64: string,
  passphrase: string,
  publicKeyBase64: string,
  tokenId: string
): Promise<EncryptedPrivateKey> {
  const { encryptPrivateKey } = await import("@/lib/crypto");
  const enc = await encryptPrivateKey(privateKeyBase64, passphrase);
  saveEncryptedKeyToStorage(enc);
  savePublicKeyToStorage(publicKeyBase64);
  saveTokenIdToStorage(tokenId);
  return enc;
}

export function useKeyContext(): KeyContextValue {
  const ctx = useContext(KeyContext);
  if (!ctx) {
    throw new Error("useKeyContext must be used within a KeyProvider");
  }
  return ctx;
}


