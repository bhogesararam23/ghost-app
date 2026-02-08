import nacl from "tweetnacl";
import { sha256 } from "js-sha256";

// Utilities for local key management and Token ID generation.
// NOTE: This uses Web Crypto for AES-GCM + PBKDF2 and tweetnacl for Ed25519 signing
// and X25519 (nacl.box) for encryption key exchange.

export interface KeyPair {
  publicKey: string; // base64 - Ed25519 signing public key
  privateKey: string; // base64 (encrypted when stored) - Ed25519 signing private key
}

export interface BoxKeyPair {
  boxPublicKey: string; // base64 - X25519 encryption public key
  boxSecretKey: string; // base64 (encrypted when stored) - X25519 encryption secret key
}

export interface EncryptedPrivateKey {
  cipherText: string; // base64
  iv: string; // base64
  salt: string; // base64
}

export interface EncryptedBoxSecretKey {
  cipherText: string; // base64
  iv: string; // base64
  salt: string; // base64
}

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

// Generate Ed25519 signing key pair
export function generateEd25519KeyPair(): KeyPair {
  const keyPair = nacl.sign.keyPair();
  const publicKey = Buffer.from(keyPair.publicKey).toString("base64");
  const privateKey = Buffer.from(keyPair.secretKey).toString("base64");
  return { publicKey, privateKey };
}

// Generate X25519 box key pair for encryption
export function generateBoxKeyPair(): BoxKeyPair {
  const keyPair = nacl.box.keyPair();
  const boxPublicKey = Buffer.from(keyPair.publicKey).toString("base64");
  const boxSecretKey = Buffer.from(keyPair.secretKey).toString("base64");
  return { boxPublicKey, boxSecretKey };
}

async function deriveAesKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations: 210_000,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPrivateKey(
  privateKeyBase64: string,
  passphrase: string
): Promise<EncryptedPrivateKey> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKeyFromPassphrase(passphrase, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    TEXT_ENCODER.encode(privateKeyBase64)
  );

  return {
    cipherText: Buffer.from(cipherBuffer).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    salt: Buffer.from(salt).toString("base64"),
  };
}

export async function decryptPrivateKey(
  enc: EncryptedPrivateKey,
  passphrase: string
): Promise<string> {
  const salt = Uint8Array.from(Buffer.from(enc.salt, "base64"));
  const iv = Uint8Array.from(Buffer.from(enc.iv, "base64"));
  const key = await deriveAesKeyFromPassphrase(passphrase, salt);

  const cipherBytes = Uint8Array.from(
    Buffer.from(enc.cipherText, "base64")
  ).buffer;

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    cipherBytes
  );

  return TEXT_DECODER.decode(plainBuffer);
}

// Encrypt box secret key with passphrase (same AES-GCM method)
export async function encryptBoxSecretKey(
  boxSecretKeyBase64: string,
  passphrase: string
): Promise<EncryptedBoxSecretKey> {
  return encryptPrivateKey(boxSecretKeyBase64, passphrase);
}

// Decrypt box secret key
export async function decryptBoxSecretKey(
  enc: EncryptedBoxSecretKey,
  passphrase: string
): Promise<string> {
  return decryptPrivateKey(enc, passphrase);
}

// Derive a shared session key using X25519 Diffie-Hellman (nacl.box.before)
// This is the SECURE method: requires my secret key + their public key.
export function deriveSessionKeyFromBox(
  myBoxSecretKeyBase64: string,
  theirBoxPublicKeyBase64: string
): Uint8Array {
  const mySecretKey = Uint8Array.from(Buffer.from(myBoxSecretKeyBase64, "base64"));
  const theirPublicKey = Uint8Array.from(Buffer.from(theirBoxPublicKeyBase64, "base64"));

  // nacl.box.before returns a 32-byte shared secret
  const sharedSecret = nacl.box.before(theirPublicKey, mySecretKey);
  return sharedSecret;
}

// Token ID: 12-character code derived from SHA-256(publicKey)
const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@$?";

export function deriveTokenId(publicKeyBase64: string): string {
  const hashHex = sha256(publicKeyBase64);
  const bytes = Buffer.from(hashHex, "hex");

  const segments: string[] = [];
  let idx = 0;

  while (segments.join("").length < 12 && idx < bytes.length) {
    const value = bytes[idx];
    const char = TOKEN_ALPHABET[value % TOKEN_ALPHABET.length];
    segments.push(char);
    idx += 1;
  }

  // Insert separators to get pattern like XXXX-XXXX-XXXX
  const raw = segments.join("").slice(0, 12);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

// Ed25519 signing key storage
export function saveEncryptedKeyToStorage(enc: EncryptedPrivateKey): void {
  if (!isBrowser()) return;
  window.localStorage.setItem("ghost_encrypted_private_key", JSON.stringify(enc));
}

export function loadEncryptedKeyFromStorage():
  | EncryptedPrivateKey
  | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem("ghost_encrypted_private_key");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedPrivateKey;
  } catch {
    return null;
  }
}

export function savePublicKeyToStorage(publicKeyBase64: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem("ghost_public_key", publicKeyBase64);
}

export function loadPublicKeyFromStorage(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem("ghost_public_key");
}

export function saveTokenIdToStorage(tokenId: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem("ghost_token_id", tokenId);
}

export function loadTokenIdFromStorage(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem("ghost_token_id");
}

// X25519 box key storage
export function saveEncryptedBoxSecretKeyToStorage(enc: EncryptedBoxSecretKey): void {
  if (!isBrowser()) return;
  window.localStorage.setItem("ghost_encrypted_box_secret_key", JSON.stringify(enc));
}

export function loadEncryptedBoxSecretKeyFromStorage(): EncryptedBoxSecretKey | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem("ghost_encrypted_box_secret_key");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedBoxSecretKey;
  } catch {
    return null;
  }
}

export function saveBoxPublicKeyToStorage(boxPublicKeyBase64: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem("ghost_box_public_key", boxPublicKeyBase64);
}

export function loadBoxPublicKeyFromStorage(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem("ghost_box_public_key");
}
