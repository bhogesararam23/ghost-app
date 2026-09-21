# Architecture

Ghost Network is structured around a simple privacy boundary:

**the client owns the cryptographic operations**

**Supabase handles coordination and persistence**

## Identity

The browser generates:

- Ed25519 signing key pair
- X25519 style encryption key pair
- Token ID derived from the public identity key

Private key material is encrypted locally before it is stored.

## Handshake

Users exchange Token IDs out of band.

A handshake request is created for the target Token ID.

After acceptance, both sides can derive shared session material from their encryption keys.

## Messaging

Message plaintext is encrypted in the browser using AES-GCM.

The database receives ciphertext and nonce information along with the metadata needed for storage and delivery.

The recipient decrypts the message locally.

## Backend boundary

The backend should not need message plaintext or private key material.

The current Supabase schema uses Row Level Security to constrain access to user, contact, handshake and message records.

## Trust boundaries

### Trusted by the current prototype

- the user's device and browser environment
- browser crypto primitives
- the local passphrase used to protect key material
- Supabase policy configuration

### Not fully protected yet

- browser compromise
- malicious extensions
- metadata analysis
- complete identity recovery
- compromised endpoints
- protocol level forward secrecy

## Why this architecture is still evolving

Encryption is only one part of a secure messenger.

Future work includes formal protocol design, key rotation, forward secrecy, better recovery, stronger metadata protection and external review.
