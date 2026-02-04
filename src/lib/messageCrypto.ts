import { sha256 } from "js-sha256";

// Utilities for encrypting/decrypting chat messages using AES-GCM with a
// symmetric session key derived from the two users' public keys.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function importAesKey(sessionKey: Uint8Array): Promise<CryptoKey> {
  // Reduce arbitrary sessionKey bytes to a 32-byte digest to satisfy AES-256.
  const keyHex = sha256(sessionKey);
  const keyBytes = Uint8Array.from(Buffer.from(keyHex, "hex"));
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(
  plainText: string,
  sessionKey: Uint8Array
): Promise<{ cipherText: string; nonce: string }> {
  const key = await importAesKey(sessionKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );

  return {
    cipherText: Buffer.from(cipherBuffer).toString("base64"),
    nonce: Buffer.from(iv).toString("base64"),
  };
}

export async function decryptMessage(
  cipherText: string,
  nonce: string,
  sessionKey: Uint8Array
): Promise<string> {
  const key = await importAesKey(sessionKey);
  const iv = Uint8Array.from(Buffer.from(nonce, "base64"));
  const cipherBytes = Uint8Array.from(Buffer.from(cipherText, "base64")).buffer;

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes
  );

  return decoder.decode(plainBuffer);
}


