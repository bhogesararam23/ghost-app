"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSupabaseAuth } from "./SupabaseAuthProvider";
import {
  EncryptedPrivateKey,
  EncryptedBoxSecretKey,
  generateEd25519KeyPair,
  generateBoxKeyPair,
  saveEncryptedKeyToStorage,
  savePublicKeyToStorage,
  saveTokenIdToStorage,
  saveEncryptedBoxSecretKeyToStorage,
  saveBoxPublicKeyToStorage,
  loadEncryptedKeyFromStorage,
  loadPublicKeyFromStorage,
  loadTokenIdFromStorage,
  loadEncryptedBoxSecretKeyFromStorage,
  loadBoxPublicKeyFromStorage,
  deriveTokenId,
  encryptPrivateKey,
  encryptBoxSecretKey,
} from "@/lib/crypto";

interface KeyContextValue {
  publicKey: string | null;
  boxPublicKey: string | null;
  tokenId: string | null;
  encryptedPrivateKey: EncryptedPrivateKey | null;
  encryptedBoxSecretKey: EncryptedBoxSecretKey | null;
  isInitialized: boolean;
  hasIdentity: boolean;
  initializeIdentity: (passphrase: string) => Promise<void>;
  syncIdentity: () => Promise<void>;
}

const KeyContext = createContext<KeyContextValue | undefined>(undefined);

export function KeyProvider({ children }: { children: React.ReactNode }) {
  // Hydration fix: Initialize state to null (server-safe)
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [boxPublicKey, setBoxPublicKey] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [encryptedPrivateKey, setEncryptedPrivateKey] =
    useState<EncryptedPrivateKey | null>(null);
  const [encryptedBoxSecretKey, setEncryptedBoxSecretKey] =
    useState<EncryptedBoxSecretKey | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const hasIdentity = !!(publicKey && boxPublicKey && tokenId && encryptedPrivateKey && encryptedBoxSecretKey);
  const { authReady, user } = useSupabaseAuth();

  // Load keys from storage on mount
  useEffect(() => {
    setPublicKey(loadPublicKeyFromStorage());
    setBoxPublicKey(loadBoxPublicKeyFromStorage());
    setTokenId(loadTokenIdFromStorage());
    setEncryptedPrivateKey(loadEncryptedKeyFromStorage());
    setEncryptedBoxSecretKey(loadEncryptedBoxSecretKeyFromStorage());
    setIsInitialized(true);
  }, []);

  const syncIdentity = async () => {
    if (!authReady || !hasIdentity || !publicKey || !boxPublicKey || !tokenId) return;

    // Use cached user if available, otherwise fetch
    let currentUser = user;
    if (!currentUser) {
      const { data } = await supabase.auth.getUser();
      currentUser = data.user;
    }

    if (!currentUser) {
      console.warn("No auth user found during sync.");
      return;
    }

    console.log("Syncing identity for user...");

    const { error } = await supabase.from("users").upsert(
      {
        id: currentUser.id,
        public_key: publicKey,
        box_public_key: boxPublicKey,
        token_id: tokenId,
        warning_acknowledged: true,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Failed to sync identity:", error);
      throw error;
    } else {
      console.log("Identity synced successfully.");
    }
  };

  // Self-healing: Ensure the user row exists in Supabase if we have a local identity.
  useEffect(() => {
    async function checkAndSync() {
      if (!authReady || !hasIdentity || !user || !publicKey) return;

      // Check if user exists with correct public key
      const { data, error } = await supabase
        .from("users")
        .select("public_key, box_public_key")
        .eq("id", user.id)
        .single();

      // If user missing or key mismatch, sync.
      if (error || !data || data.public_key !== publicKey || data.box_public_key !== boxPublicKey) {
        console.log("User missing or key mismatch on server, syncing...");
        syncIdentity().catch((err) => console.error("Auto-sync failed:", err));
      }
    }

    if (authReady && hasIdentity) {
      checkAndSync();
    }
  }, [authReady, hasIdentity, user, publicKey, boxPublicKey]);

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

      if (anonError || !anonData?.user) {
        throw new Error("No Supabase auth user; ensure auth session is created.");
      }
      currentUser = anonData.user;
    }

    // Generate both key pairs
    const { publicKey: signingPub, privateKey: signingPriv } = generateEd25519KeyPair();
    const { boxPublicKey: boxPub, boxSecretKey: boxSec } = generateBoxKeyPair();
    const token = deriveTokenId(signingPub);

    // Encrypt both keys
    const encSigningKey = await encryptPrivateKey(signingPriv, passphrase);
    const encBoxKey = await encryptBoxSecretKey(boxSec, passphrase);

    // Persist to localStorage
    saveEncryptedKeyToStorage(encSigningKey);
    savePublicKeyToStorage(signingPub);
    saveTokenIdToStorage(token);
    saveEncryptedBoxSecretKeyToStorage(encBoxKey);
    saveBoxPublicKeyToStorage(boxPub);

    // Upsert into Supabase users table
    const { error } = await supabase.from("users").upsert(
      {
        id: currentUser.id,
        public_key: signingPub,
        box_public_key: boxPub,
        token_id: token,
        warning_acknowledged: true,
      },
      { onConflict: "id" }
    );

    if (error) {
      console.error("Supabase users upsert failed:", error);
      throw error;
    }

    setPublicKey(signingPub);
    setBoxPublicKey(boxPub);
    setTokenId(token);
    setEncryptedPrivateKey(encSigningKey);
    setEncryptedBoxSecretKey(encBoxKey);
  };

  return (
    <KeyContext.Provider
      value={{
        publicKey,
        boxPublicKey,
        tokenId,
        encryptedPrivateKey,
        encryptedBoxSecretKey,
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

export function useKeyContext(): KeyContextValue {
  const ctx = useContext(KeyContext);
  if (!ctx) {
    throw new Error("useKeyContext must be used within a KeyProvider");
  }
  return ctx;
}
