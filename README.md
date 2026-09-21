# Ghost Network 👻

> A privacy focused messaging prototype built around local identity, client side encryption and a server that mainly acts as a relay

Ghost Network started with a simple idea

**can we build messaging where the server does not need to know the actual identity behind a user or the content of their messages**

The current repository is a working prototype around that idea.

It has local cryptographic identity generation, token based discovery, a handshake flow, encrypted messaging, Supabase persistence and a Next.js frontend.

It is still a prototype though.

Some of the important security pieces are implemented properly at the primitive level but the complete system has **not** been formally audited and there are still architectural limitations that need to be solved before this should be treated as a production secure messenger.

## What is currently here

The current flow is roughly

```text
Create local identity
        ↓
Generate signing + encryption key pairs
        ↓
Create Token ID
        ↓
Share Token ID out of band
        ↓
Handshake
        ↓
Derive shared session material
        ↓
Encrypt message locally
        ↓
Store ciphertext in Supabase
        ↓
Recipient decrypts locally
```

The server therefore does not need the plaintext message to deliver it.

The repository also uses Supabase anonymous authentication as the application level account/session mechanism while the cryptographic identity is kept separately in the browser.

## Current status

### Implemented foundations

- Next.js App Router application
- React + TypeScript
- Tailwind CSS
- Supabase integration
- Supabase PostgreSQL schema
- Row Level Security policies
- Anonymous Supabase authentication flow
- Local Ed25519 signing key generation
- Local X25519 compatible box key generation through `tweetnacl`
- AES-GCM encryption for locally stored private key material
- PBKDF2 based passphrase protection
- Token ID generation from the public key
- Local key and identity persistence
- Identity sync to Supabase
- Token based handshake flow
- Shared session key derivation with X25519
- AES-GCM encrypted messaging
- Chat UI
- Contacts
- Message expiry fields and cleanup support
- Error boundary and toast based UI feedback
- Input validation
- Vitest test setup
- Crypto utility tests
- Validation tests
- Basic security headers in Next.js configuration
- Contributor documentation

### Still being worked on

The project still has major things to solve before it can be called a mature private messenger.

Some of the bigger ones are

- proper forward secrecy
- message key rotation
- stronger identity recovery
- better abuse and spam protection
- multi device support
- complete test coverage
- formal cryptographic review
- stronger metadata protection
- production deployment hardening
- better real time messaging behaviour
- security focused monitoring and auditing

## Important transparency

This is probably the most important part of this README.

Ghost Network uses real cryptographic primitives such as Ed25519, X25519 style key exchange and AES-GCM.

That does **not** automatically mean the entire application is secure.

The complete protocol and implementation have not gone through a formal security audit.

There are also some known prototype level limitations.

### Private keys and browser storage

Encrypted private key material is stored in browser `localStorage`.

The private keys are encrypted with a user passphrase before storage which is better than storing them as plaintext, but `localStorage` itself is still not an ideal secure key store for a production security critical application.

Clearing browser data can also destroy the locally stored identity unless recovery is implemented and tested properly.

### No proper forward secrecy yet

The current system derives shared session material for contacts but it does not yet implement a Double Ratchet style protocol with per message key evolution.

That means forward secrecy and post compromise security are still future work.

### Recovery is currently experimental

There is a mnemonic based recovery implementation in the repository but it is explicitly a simplified prototype implementation and should not be treated as a production BIP39 wallet style recovery system.

This needs to be replaced with a properly designed and tested recovery protocol.

### Server metadata still exists

Even when message content is encrypted, the backend still needs to process things like identifiers, sender and recipient relationships, timestamps and delivery related information.

So saying that the server knows absolutely nothing would be too strong.

The goal is to minimize what the server can learn and keep message content away from it.

## Architecture

### 1. Local identity

When an identity is created the client generates

- an Ed25519 signing key pair
- an X25519 style encryption key pair
- a Token ID derived from the public identity key

Private key material is encrypted locally with a passphrase using AES-GCM and PBKDF2 before being stored.

The server receives the public information needed for discovery and handshake operations.

### 2. Token based discovery

There is no traditional public username directory in the current design.

Instead a user can share their Token ID out of band.

The Token ID is derived from the public key and is formatted like

```text
XXXX-XXXX-XXXX
```

This is intended to make sharing an identity identifier easier without exposing a normal email or phone number based account model.

### 3. Handshake

The handshake is the point where two identities become contacts.

The current flow uses the target Token ID to find the recipient and allows the target user to accept the request.

The application then derives shared session material from the relevant encryption keys.

### 4. Messaging

Messages are encrypted on the client using AES-GCM.

The database stores ciphertext and nonce values rather than plaintext message content.

Supabase RLS policies restrict message rows to the sender or recipient.

### 5. Identity synchronization

The application includes a self healing identity sync flow.

When the local identity exists but the corresponding server record is missing or has a mismatched public key, the client can sync the identity again.

This is useful for a prototype because browser state and backend state can get out of sync during development.

## Architecture overview

```text
┌─────────────────────────────┐
│          Browser            │
│                             │
│  Identity / Key Management  │
│  Token ID                   │
│  Handshake                  │
│  Message Encryption         │
│  Message Decryption         │
└──────────────┬──────────────┘
               │
               │ encrypted / metadata
               ▼
┌─────────────────────────────┐
│          Supabase           │
│                             │
│ PostgreSQL                  │
│ Row Level Security          │
│ Anonymous Auth              │
│ Handshakes                  │
│ Contacts                    │
│ Messages                    │
│ Message Status              │
└─────────────────────────────┘
```

The intended boundary is simple

**cryptographic operations happen on the client**

**storage and coordination happen on the backend**

## Tech stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend and infrastructure

- Supabase
- PostgreSQL
- Row Level Security
- Supabase Auth

### Cryptography

- Web Crypto API
- AES-GCM
- PBKDF2
- tweetnacl
- libsodium-wrappers
- Ed25519
- X25519 style key exchange
- SHA-256

### Testing

- Vitest
- happy-dom

## Repository structure

```text
ghost-app/
├── src/
│   ├── app/
│   │   ├── chat/              # Chat interface and messaging flow
│   │   ├── handshake/         # Contact handshake flow
│   │   ├── onboarding/        # Identity setup
│   │   ├── settings/          # Identity and app settings
│   │   ├── token/             # Token ID display / management
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/            # Shared UI components
│   ├── context/               # Key + auth state
│   └── lib/
│       ├── __tests__/          # Vitest tests
│       ├── crypto.ts           # Identity and key utilities
│       ├── messageCrypto.ts    # Message encryption / decryption
│       ├── mnemonic.ts         # Prototype recovery helpers
│       ├── supabaseClient.ts   # Supabase client
│       └── validation.ts       # Input validation
│
├── supabase/
│   └── schema.sql             # Database schema and RLS policies
│
├── public/
├── next.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Getting started

### Requirements

You need

- Node.js 18+
- npm
- a Supabase project

### 1. Clone

```bash
git clone https://github.com/bhogesararam23/ghost-app.git
cd ghost-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Supabase

Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit real credentials or secret keys.

### 4. Initialize the database

Open the Supabase SQL editor and run

```text
supabase/schema.sql
```

This creates the main tables, RLS policies, cleanup function and handshake RPC used by the current prototype.

### 5. Start the development server

```bash
npm run dev
```

Then open the local URL shown by Next.js.

### 6. Run tests

```bash
npm test
```

For the Vitest UI

```bash
npm run test:ui
```

### 7. Build

```bash
npm run build
```

## Testing

The repository already contains tests around some of the security sensitive utility code.

Current test areas include

- Ed25519 key generation
- box key generation
- encrypted private key storage and recovery
- token ID generation
- input validation
- message related crypto helpers

The test suite is still not complete enough to prove the whole protocol is correct.

That is one of the roadmap items.

## Development principles

### Privacy by design

Keep plaintext and private key material on the client whenever possible.

### Crypto before convenience

Do not replace a cryptographic operation with a convenient application level shortcut just because the shortcut is easier.

### Server should not need plaintext

The backend should coordinate delivery and persistence without becoming the place where message content is decrypted.

### Be honest about security

Using strong primitives is only one part of security.

Protocol design, key lifecycle, recovery, authentication, metadata, implementation correctness and operational security all matter too.

### Small and testable modules

Crypto, validation, identity management, messaging and UI logic should stay separated so each part can be tested and changed without breaking the whole application.

## Roadmap

The current direction is

**prototype → protocol hardening → stronger privacy → real world usability → security review → production readiness**

The roadmap is intentionally not just a feature list. Some items are security work and should happen before adding more user facing features.

### Phase 0 — Stabilize the current prototype

**Status: in progress**

- [x] Next.js application structure
- [x] Supabase integration
- [x] Local identity generation
- [x] Token ID system
- [x] Handshake flow
- [x] Encrypted messaging foundation
- [x] Supabase RLS policies
- [x] Basic crypto tests
- [x] Validation tests
- [x] Error handling foundation
- [ ] Improve end to end test coverage
- [ ] Remove prototype fallbacks
- [ ] Document all client/server trust boundaries
- [ ] Add better automated checks for database policies
- [ ] Test the complete onboarding → handshake → chat flow automatically

### Phase 1 — Fix the cryptographic protocol

**Status: next major focus**

- [ ] Formalize the protocol
- [ ] Define exact key lifecycle
- [ ] Add message key rotation
- [ ] Implement Double Ratchet style forward secrecy
- [ ] Add post compromise recovery
- [ ] Improve session establishment
- [ ] Add identity authentication / verification
- [ ] Prevent handshake replay
- [ ] Improve nonce and key lifecycle guarantees
- [ ] Write protocol level tests and test vectors
- [ ] Document threat model

The goal here is to make the crypto architecture something we can reason about formally instead of only checking whether the code seems to work.

### Phase 2 — Identity and recovery

**Status: planned**

- [ ] Replace simplified mnemonic implementation
- [ ] Design proper identity backup
- [ ] Test deterministic recovery
- [ ] Add explicit device recovery flow
- [ ] Add identity rotation / replacement
- [ ] Add lost device handling
- [ ] Add recovery warnings and confirmation UX
- [ ] Reduce dependence on localStorage
- [ ] Evaluate Web Crypto / browser secure storage options

### Phase 3 — Better messaging

**Status: planned**

- [ ] Real time message subscriptions
- [ ] Reliable offline queue
- [ ] Retry handling
- [ ] Delivery state
- [ ] Read state
- [ ] Better message expiry
- [ ] Conversation search where it does not compromise the design
- [ ] Attachments
- [ ] Reply / reaction support
- [ ] Better mobile experience
- [ ] Notification support
- [ ] Message synchronization after reconnect

### Phase 4 — Privacy and metadata protection

**Status: planned**

- [ ] Reduce metadata exposure
- [ ] Minimize long lived identifiers
- [ ] Review timestamp leakage
- [ ] Review contact relationship leakage
- [ ] Explore sealed sender style approaches
- [ ] Explore anonymous mailbox designs
- [ ] Improve server side retention controls
- [ ] Make cleanup behaviour deterministic
- [ ] Document exactly what Supabase can still observe

This phase matters because end to end encryption alone does not solve metadata privacy.

### Phase 5 — Multi device and ecosystem

**Status: planned**

- [ ] Multiple devices per identity
- [ ] Device linking
- [ ] Device revocation
- [ ] Cross device key synchronization
- [ ] QR based pairing
- [ ] Desktop client
- [ ] Mobile client
- [ ] Better notification infrastructure

### Phase 6 — Security engineering

**Status: planned**

- [ ] Threat model review
- [ ] Dependency auditing
- [ ] Static analysis
- [ ] Security focused CI
- [ ] Database policy testing
- [ ] Fuzzing for parsers and validation
- [ ] External cryptographic review
- [ ] Penetration testing
- [ ] Incident response documentation
- [ ] Security disclosure process
- [ ] Reproducible builds where practical

### Phase 7 — Production readiness

**Status: longer term**

- [ ] Production deployment architecture
- [ ] Secrets management
- [ ] Monitoring
- [ ] Rate limiting
- [ ] Abuse prevention
- [ ] Backup and recovery procedures
- [ ] Operational alerts
- [ ] Performance testing
- [ ] Load testing
- [ ] Availability testing
- [ ] Privacy documentation
- [ ] Security documentation
- [ ] Public beta

## What I do not want this project to become

A privacy app should not become a normal centralized chat application with encryption added later just for the feature list.

The current architecture is being built around the privacy boundary first.

That means some normal messaging features may come later because adding them safely is harder.

## Current limitations

Being transparent about the current state

- This is still a prototype
- It has not had a formal security audit
- Private key material currently relies on browser localStorage
- Forward secrecy is not implemented yet
- The recovery phrase implementation is simplified
- Metadata is not completely hidden
- The backend still sees some user and message related metadata needed for coordination
- Multi device support is not implemented
- Complete end to end protocol testing is not implemented
- Some production protections are still missing
- No claim of production grade anonymity should be made from the current implementation

These are known limitations and are part of the roadmap rather than things being hidden.

## Contributing

The project is security and privacy focused so changes need to be treated a little differently from a normal web application.

Basic workflow

```text
Issue → Branch → Implementation → Tests → Pull Request → Review → Merge
```

Before submitting changes

```bash
npm test
npm run build
npm run lint
```

For crypto related changes also explain

- what keys are involved
- where the keys exist
- what the server can see
- what the client can see
- what happens after key loss
- whether forward secrecy is affected
- whether existing identities remain compatible

Do not commit

- private keys
- passphrases
- Supabase secrets
- production credentials
- real user message content

## Security reporting

Please do not publish an undisclosed security vulnerability in a normal public issue.

Use a private security reporting path for vulnerabilities so they can be investigated before public disclosure.

## License

This repository is licensed under the **GNU Affero General Public License v3.0**.
