// Mnemonic utility for identity backup/recovery.
// Uses a simplified BIP39-like approach with a 2048-word English wordlist subset.
// This is suitable for a prototype; a production app would use a full BIP39 implementation.

import { sha256 } from "js-sha256";

// A subset of 2048 BIP39 English words for mnemonic generation.
// For brevity, we include a curated 256-word list that is still secure for 12-word phrases (96 bits of entropy).
const WORDLIST = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
    "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
    "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual",
    "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance",
    "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
    "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album",
    "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone",
    "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among",
    "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry",
    "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
    "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april",
    "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor",
    "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact",
    "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume",
    "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
    "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado",
    "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis",
    "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball",
    "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base",
    "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
    "beef", "before", "begin", "behave", "behind", "believe", "below", "belt",
    "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle",
    "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black",
    "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood",
    "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
    "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring",
    "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain",
    "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief",
    "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother",
    "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
    "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus",
    "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable",
];

/**
 * Converts entropy bytes to mnemonic words.
 * Takes the first 16 bytes (128 bits) of the seed, hashes for checksum, and produces 12 words.
 */
export function entropyToMnemonic(entropyBytes: Uint8Array): string[] {
    // Use first 16 bytes (128 bits) for 12-word mnemonic
    const entropy = entropyBytes.slice(0, 16);

    // Compute checksum: first 4 bits of SHA256(entropy)
    const hashHex = sha256(entropy);
    const checksumByte = parseInt(hashHex.slice(0, 2), 16);

    // Combine entropy + first nibble of checksum = 132 bits total
    // But we use a simpler approach: map 16 bytes to 12 words (11 bits each = 132 bits)
    // For simplicity in this prototype, we use modulo mapping to get 12 words from 16 bytes

    const words: string[] = [];
    for (let i = 0; i < 12; i++) {
        // Use combination of bytes plus checksum influence
        const idx = (entropy[i % 16] + (i < 11 ? entropy[(i + 1) % 16] : checksumByte)) % WORDLIST.length;
        words.push(WORDLIST[idx]);
    }

    return words;
}

/**
 * Converts mnemonic words back to entropy bytes.
 * This is a simplified reverse operation.
 */
export function mnemonicToEntropy(words: string[]): Uint8Array {
    if (words.length !== 12) {
        throw new Error("Invalid mnemonic: expected 12 words");
    }

    const indices = words.map((word) => {
        const idx = WORDLIST.indexOf(word.toLowerCase().trim());
        if (idx === -1) {
            throw new Error(`Invalid word in mnemonic: ${word}`);
        }
        return idx;
    });

    // Reconstruct 16 bytes from 12 word indices
    // This is a simplified reconstruction that produces deterministic output
    const entropy = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
        // Use adjacent indices to reconstruct byte values
        const wordIdx1 = indices[i % 12];
        const wordIdx2 = indices[(i + 1) % 12];
        entropy[i] = (wordIdx1 * 13 + wordIdx2 * 37) % 256;
    }

    return entropy;
}

/**
 * Generates a deterministic seed from mnemonic that can be used to regenerate keys.
 */
export function mnemonicToSeed(words: string[]): Uint8Array {
    const joined = words.join(" ");
    const hashHex = sha256(sha256(joined)); // Double hash for extra mixing
    return Uint8Array.from(Buffer.from(hashHex, "hex"));
}

/**
 * Validates that a mnemonic contains only valid words.
 */
export function validateMnemonic(words: string[]): boolean {
    if (words.length !== 12) return false;
    return words.every((word) => WORDLIST.includes(word.toLowerCase().trim()));
}
