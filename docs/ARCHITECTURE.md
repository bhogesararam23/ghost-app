# Architecture

Ghost Network is a privacy-focused messaging prototype built around a simple boundary:

**cryptographic operations happen on the client**

**Supabase handles coordination and persistence**

## Components

### Browser application

The Next.js client currently owns local identity creation, key management, Token ID generation, handshake UI, session establishment, message encryption/decryption, protected local key storage, and chat/contact state.

Relevant areas:

- `src/app/` — routes and application UI
- `src/context/` — application-level key and auth state
- `src/lib/crypto.ts` — identity and key utilities
- `src/lib/messageCrypto.ts` — message encryption/decryption
- `src/lib/validation.ts` — validation logic

### Supabase

Supabase currently provides PostgreSQL persistence, Row Level Security, anonymous application authentication, and coordination for identities, handshakes, contacts, and messages.

The server should not require plaintext message content or client private keys for normal coordination.

## Identity flow

1. Browser generates an Ed25519 signing key pair.
2. Browser generates an X25519-style encryption key pair.
3. A Token ID is derived from public identity material.
4. Private key material is protected locally before persistence.
5. Public information needed for discovery/handshake is synchronized to Supabase.

## Handshake flow

1. User shares a Token ID out of band.
2. Server-side coordination resolves the target.
3. A handshake request is created.
4. Recipient accepts or rejects the request.
5. Clients derive shared session material from their encryption keys.

The exact protocol is still evolving and requires further formalization and verification.

## Message flow

1. Plaintext exists on the sender client.
2. Client derives or obtains the current prototype session material.
3. Client encrypts the message using AES-GCM.
4. Ciphertext and delivery metadata are sent to Supabase.
5. Recipient retrieves ciphertext.
6. Recipient decrypts locally.

The design aims to keep message plaintext out of the backend.

## Trust boundaries

### Trusted by the current prototype

- the user's device and browser environment
- browser cryptography implementations
- the local passphrase used to protect key material
- deployed Supabase RLS configuration

### Not fully protected yet

- browser compromise
- malicious browser extensions
- endpoint compromise
- metadata analysis
- full identity recovery
- protocol-level forward secrecy
- post-compromise security
- multi-device consistency

## Security properties not yet claimed

The current implementation should not be described as providing production-grade anonymity, formal end-to-end security guarantees, forward secrecy, post-compromise security, or complete metadata protection.

## Design principles

### Privacy by design
Keep plaintext and long-lived private key material on the client whenever the design permits it.

### Crypto before convenience
Do not replace a cryptographic operation with an application shortcut merely because it is easier.

### Small, testable modules
Keep cryptography, validation, identity management, messaging, and UI logic separable.

### Conservative security claims
Document what is implemented, what is assumed, and what remains unresolved.
