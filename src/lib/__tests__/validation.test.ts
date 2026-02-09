import { describe, it, expect } from "vitest";
import {
    validateTokenId,
    validatePassphrase,
    validateMessage,
    validatePublicKey,
} from "../validation";

describe("Validation Utilities", () => {
    describe("validateTokenId", () => {
        it("should accept valid Token ID format", () => {
            const result = validateTokenId("ABCD-EFGH-IJKL");
            expect(result.valid).toBe(true);
        });

        it("should accept Token IDs with special characters", () => {
            const result = validateTokenId("AB2!-EF$H-9JK?");
            expect(result.valid).toBe(true);
        });

        it("should reject Token ID with wrong format", () => {
            const result = validateTokenId("ABCDEFGHIJKL");
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it("should reject Token ID with lowercase letters", () => {
            const result = validateTokenId("abcd-efgh-ijkl");
            expect(result.valid).toBe(false);
        });

        it("should reject empty Token ID", () => {
            const result = validateTokenId("");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("required");
        });

        it("should reject Token ID with wrong length", () => {
            const result = validateTokenId("ABC-DEF-GHI");
            expect(result.valid).toBe(false);
        });
    });

    describe("validatePassphrase", () => {
        it("should accept strong passphrase", () => {
            const result = validatePassphrase("MyStr0ng!Pass123");
            expect(result.valid).toBe(true);
            expect(result.strength).toBe("strong");
        });

        it("should accept medium strength passphrase", () => {
            const result = validatePassphrase("MyPass123");
            expect(result.valid).toBe(true);
            expect(result.strength).toBe("medium");
        });

        it("should accept weak but valid passphrase", () => {
            const result = validatePassphrase("password");
            expect(result.valid).toBe(true);
            expect(result.strength).toBe("weak");
        });

        it("should reject too short passphrase", () => {
            const result = validatePassphrase("short");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("at least 8 characters");
        });

        it("should reject empty passphrase", () => {
            const result = validatePassphrase("");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("required");
        });
    });

    describe("validateMessage", () => {
        it("should accept valid message", () => {
            const result = validateMessage("Hello, world!");
            expect(result.valid).toBe(true);
        });

        it("should trim and validate message", () => {
            const result = validateMessage("   Hello   ");
            expect(result.valid).toBe(true);
        });

        it("should reject empty message", () => {
            const result = validateMessage("");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("empty");
        });

        it("should reject whitespace-only message", () => {
            const result = validateMessage("   ");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("empty");
        });

        it("should reject extremely long message", () => {
            const longMessage = "a".repeat(10001);
            const result = validateMessage(longMessage);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("too long");
        });
    });

    describe("validatePublicKey", () => {
        it("should accept valid base64 public key", () => {
            // Generate a valid 32-byte base64 string (44 chars)
            const validKey = Buffer.from(new Uint8Array(32)).toString("base64");
            const result = validatePublicKey(validKey);
            expect(result.valid).toBe(true);
        });

        it("should reject invalid base64", () => {
            const result = validatePublicKey("not-base64-at-all!");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("base64");
        });

        it("should reject wrong length public key", () => {
            const shortKey = "abc123";
            const result = validatePublicKey(shortKey);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("44 characters");
        });

        it("should reject empty public key", () => {
            const result = validatePublicKey("");
            expect(result.valid).toBe(false);
            expect(result.error).toContain("required");
        });
    });
});
