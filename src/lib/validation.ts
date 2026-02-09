// Input validation utilities for Ghost Network

const TOKEN_ID_PATTERN = /^[A-Z2-9!@$?]{4}-[A-Z2-9!@$?]{4}-[A-Z2-9!@$?]{4}$/;
const MIN_PASSPHRASE_LENGTH = 8;
const MAX_MESSAGE_LENGTH = 10000;

/**
 * Validates Token ID format (XXXX-XXXX-XXXX)
 */
export function validateTokenId(tokenId: string): { valid: boolean; error?: string } {
    if (!tokenId || typeof tokenId !== "string") {
        return { valid: false, error: "Token ID is required" };
    }

    const trimmed = tokenId.trim();
    if (!TOKEN_ID_PATTERN.test(trimmed)) {
        return {
            valid: false,
            error: "Token ID must be in format XXXX-XXXX-XXXX (12 characters)",
        };
    }

    return { valid: true };
}

/**
 * Validates passphrase strength
 */
export function validatePassphrase(passphrase: string): {
    valid: boolean;
    error?: string;
    strength?: "weak" | "medium" | "strong";
} {
    if (!passphrase || typeof passphrase !== "string") {
        return { valid: false, error: "Passphrase is required" };
    }

    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
        return {
            valid: false,
            error: `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`,
            strength: "weak",
        };
    }

    // Calculate strength
    let strength: "weak" | "medium" | "strong" = "weak";
    const hasUpperCase = /[A-Z]/.test(passphrase);
    const hasLowerCase = /[a-z]/.test(passphrase);
    const hasNumbers = /[0-9]/.test(passphrase);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(passphrase);

    const criteriaCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(
        Boolean
    ).length;

    if (passphrase.length >= 12 && criteriaCount >= 3) {
        strength = "strong";
    } else if (passphrase.length >= 10 && criteriaCount >= 2) {
        strength = "medium";
    }

    return { valid: true, strength };
}

/**
 * Sanitizes and validates message content
 */
export function validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || typeof message !== "string") {
        return { valid: false, error: "Message cannot be empty" };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: "Message cannot be empty" };
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
        return {
            valid: false,
            error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
        };
    }

    return { valid: true };
}

/**
 * Validates public key format (base64)
 */
export function validatePublicKey(publicKey: string): { valid: boolean; error?: string } {
    if (!publicKey || typeof publicKey !== "string") {
        return { valid: false, error: "Public key is required" };
    }

    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Pattern.test(publicKey)) {
        return { valid: false, error: "Public key must be valid base64" };
    }

    // Ed25519 public keys should be 32 bytes = 44 base64 characters (with padding)
    const expectedLength = 44;
    if (publicKey.length !== expectedLength) {
        return {
            valid: false,
            error: `Public key must be ${expectedLength} characters (base64-encoded 32 bytes)`,
        };
    }

    return { valid: true };
}

/**
 * Rate limiting helper using localStorage
 */
export function checkRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number
): { allowed: boolean; remainingAttempts: number } {
    if (typeof window === "undefined") {
        return { allowed: true, remainingAttempts: maxAttempts };
    }

    const storageKey = `ratelimit_${key}`;
    const now = Date.now();
    const stored = localStorage.getItem(storageKey);

    let attempts: number[] = [];
    if (stored) {
        try {
            attempts = JSON.parse(stored).filter((timestamp: number) => now - timestamp < windowMs);
        } catch {
            attempts = [];
        }
    }

    if (attempts.length >= maxAttempts) {
        return { allowed: false, remainingAttempts: 0 };
    }

    attempts.push(now);
    localStorage.setItem(storageKey, JSON.stringify(attempts));

    return { allowed: true, remainingAttempts: maxAttempts - attempts.length };
}
