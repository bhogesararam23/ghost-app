import { describe, it, expect } from "vitest";
import {
    generateEd25519KeyPair,
    generateBoxKeyPair,
    encryptPrivateKey,
    decryptPrivateKey,
    deriveTokenId,
    deriveSessionKeyFromBox,
} from "../crypto";

describe("Crypto Utilities", () => {
    describe("generateEd25519KeyPair", () => {
        it("should generate a valid Ed25519 key pair", () => {
            const { publicKey, privateKey } = generateEd25519KeyPair();

            expect(publicKey).toBeDefined();
            expect(privateKey).toBeDefined();
            expect(typeof publicKey).toBe("string");
            expect(typeof privateKey).toBe("string");

            // Ed25519 public key should be 32 bytes (44 chars base64)
            expect(publicKey.length).toBe(44);
        });

        it("should generate unique key pairs", () => {
            const pair1 = generateEd25519KeyPair();
            const pair2 = generateEd25519KeyPair();

            expect(pair1.publicKey).not.toBe(pair2.publicKey);
            expect(pair1.privateKey).not.toBe(pair2.privateKey);
        });
    });

    describe("generateBoxKeyPair", () => {
        it("should generate a valid X25519 key pair", () => {
            const { boxPublicKey, boxSecretKey } = generateBoxKeyPair();

            expect(boxPublicKey).toBeDefined();
            expect(boxSecretKey).toBeDefined();
            expect(typeof boxPublicKey).toBe("string");
            expect(typeof boxSecretKey).toBe("string");
        });
    });

    describe("encryptPrivateKey and decryptPrivateKey", () => {
        it("should encrypt and decrypt private key correctly", async () => {
            const { privateKey } = generateEd25519KeyPair();
            const passphrase = "test-passphrase-12345";

            const encrypted = await encryptPrivateKey(privateKey, passphrase);

            expect(encrypted.cipherText).toBeDefined();
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.salt).toBeDefined();

            const decrypted = await decryptPrivateKey(encrypted, passphrase);
            expect(decrypted).toBe(privateKey);
        });

        it("should fail to decrypt with wrong passphrase", async () => {
            const { privateKey } = generateEd25519KeyPair();
            const correctPassphrase = "correct-passphrase";
            const wrongPassphrase = "wrong-passphrase";

            const encrypted = await encryptPrivateKey(privateKey, correctPassphrase);

            await expect(
                decryptPrivateKey(encrypted, wrongPassphrase)
            ).rejects.toThrow();
        });

        it("should use different salts for same passphrase", async () => {
            const { privateKey } = generateEd25519KeyPair();
            const passphrase = "same-passphrase";

            const enc1 = await encryptPrivateKey(privateKey, passphrase);
            const enc2 = await encryptPrivateKey(privateKey, passphrase);

            expect(enc1.salt).not.toBe(enc2.salt);
            expect(enc1.cipherText).not.toBe(enc2.cipherText);
        });
    });

    describe("deriveTokenId", () => {
        it("should generate a Token ID in correct format", () => {
            const { publicKey } = generateEd25519KeyPair();
            const tokenId = deriveTokenId(publicKey);

            expect(tokenId).toMatch(/^[A-Z2-9!@$?]{4}-[A-Z2-9!@$?]{4}-[A-Z2-9!@$?]{4}$/);
        });

        it("should generate consistent Token ID for same public key", () => {
            const { publicKey } = generateEd25519KeyPair();
            const tokenId1 = deriveTokenId(publicKey);
            const tokenId2 = deriveTokenId(publicKey);

            expect(tokenId1).toBe(tokenId2);
        });

        it("should generate unique Token IDs for different public keys", () => {
            const pair1 = generateEd25519KeyPair();
            const pair2 = generateEd25519KeyPair();
            const tokenId1 = deriveTokenId(pair1.publicKey);
            const tokenId2 = deriveTokenId(pair2.publicKey);

            expect(tokenId1).not.toBe(tokenId2);
        });
    });

    describe("deriveSessionKeyFromBox", () => {
        it("should derive consistent session key from box keys", () => {
            const alice = generateBoxKeyPair();
            const bob = generateBoxKeyPair();

            // Alice derives session key using her secret and Bob's public
            const aliceSessionKey = deriveSessionKeyFromBox(
                alice.boxSecretKey,
                bob.boxPublicKey
            );

            // Bob derives session key using his secret and Alice's public
            const bobSessionKey = deriveSessionKeyFromBox(
                bob.boxSecretKey,
                alice.boxPublicKey
            );

            // Both should derive the same session key
            expect(Buffer.from(aliceSessionKey).toString("base64")).toBe(
                Buffer.from(bobSessionKey).toString("base64")
            );
        });

        it("should derive 32-byte session key", () => {
            const alice = generateBoxKeyPair();
            const bob = generateBoxKeyPair();

            const sessionKey = deriveSessionKeyFromBox(
                alice.boxSecretKey,
                bob.boxPublicKey
            );

            expect(sessionKey.length).toBe(32);
        });
    });
});
