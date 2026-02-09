# Ghost Network 👻

**Ghost Network** is a prototype for a decentralized, local-first, end-to-end encrypted messaging application. It is designed to demonstrate privacy-preserving communication where the server acts solely as a blind relay, possessing zero knowledge of user identities or message content.

## 🚀 Key Features

- **Local-First Identity**: No email, phone number, or password required. Your identity is an Ed25519 keypair generated securely in your browser.
- **End-to-End Encryption**: All messages are encrypted using ephemeral session keys derived via ECDH (X25519). The server stores only ciphertext.
- **Zero-Knowledge Architecture**: The backend (Supabase) orchestrates message delivery but lacks the cryptographic keys to decrypt them.
- **Network Agnostic**: Designed to operate without a central user directory. Connections are established via out-of-band Token ID exchange (Handshake).
- **Self-Healing Sync**: Automatic synchronization ensures your local identity remains recognized by the relay network without user intervention.

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: TailwindCSS
- **Backend/Database**: Supabase (PostgreSQL with Row Level Security)
- **Cryptography**: 
  - `libsodium-wrappers` / `tweetnacl` (Ed25519 signatures, X25519 key exchange)
  - `Web Crypto API` (AES-GCM encryption)

## 🏗 Architecture

### 1. Identity Generation
Identities are generated locally using `Ed25519`. The private key is encrypted with a user-provided passphrase using AES-GCM and stored in `localStorage`. The server receives only the Public Key and a derived `Token ID`.

### 2. Handshake Protocol
To prevent spam and ensure trust, users must perform a cryptographic handshake:
1. **Initiator** shares their `Token ID`.
2. **Receiver** requests a connection.
3. **Initiator** accepts, utilizing the public keys to derive a shared secret.

### 3. Messaging
Messages are encrypted with high-entropy nonces. The database enforces strict Row Level Security (RLS) policies, ensuring users can only access messages explicitly addressed to them or sent by them.

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ghost-network.git
   cd ghost-network
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Initialize Database**
   Run the SQL scripts in `supabase/schema.sql` in your Supabase SQL Editor to set up tables and RLS policies.

5. **Run the Development Server**
   ```bash
   npm run dev
   ```

6. **Run Tests (Optional)**
   ```bash
   npm test
   ```

## 🧪 Testing

The project uses Vitest for testing:

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm test -- --watch
```

Tests cover:
- Cryptographic utilities (key generation, encryption/decryption)
- Input validation (token IDs, passphrases, messages)
- Session key derivation (ECDH)

## 🐛 Troubleshooting

### Common Issues

**Issue: "Initiator identity not found" during handshake**
- **Cause**: The initiating user's identity hasn't synced to Supabase
- **Solution**: The initiator should refresh their browser or navigate to Settings and use "Force Sync Identity"

**Issue: Messages not appearing in chat**
- **Cause**: Decryption failure or session key mismatch
- **Solution**: Verify both parties completed the handshake successfully. Check browser console for errors.

**Issue: "Failed to load contacts"**
- **Cause**: Supabase connection issue or RLS policy problem
- **Solution**: Check `.env.local` credentials are correct. Verify RLS policies are applied in Supabase.

**Issue: Hydration mismatch errors**
- **Cause**: Server/client rendering mismatch with localStorage
- **Solution**: Clear localStorage and refresh. This is expected on first load as keys are loaded client-side.

**Issue: "No Supabase auth user"**
- **Cause**: Anonymous session hasn't been created
- **Solution**: Ensure Supabase anonymous authentication is enabled in your project settings.

### Development Best Practices

1. **Never** commit `.env.local` - it contains secrets
2. **Always** test handshake flow after crypto changes
3. **Clear** localStorage when testing identity generation
4. **Use** browser DevTools Application tab to inspect stored keys
5. **Monitor** Supabase logs for RLS policy issues

## 🛡 Security Note

This is a **concept prototype**. While it uses industry-standard cryptographic primitives, it has not undergone a formal security audit. 
- **Private keys live in localStorage**: Clearing browser data destroys your identity.
- **No Forward Secrecy (yet)**: Session keys do not yet rotate per message (Double Ratchet not yet implemented).

## 📄 License

MIT
