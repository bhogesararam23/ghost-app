# Security Policy

## Scope

Ghost Network is an experimental privacy-focused project. The repository uses established cryptographic primitives, but the complete protocol and application have **not** been formally security audited.

Do not use the current prototype for high-risk communications and do not interpret the project as providing production-grade anonymity.

## Supported versions

The `master` branch is the active development line. Older commits and branches are not considered supported security releases.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for an undisclosed security vulnerability.

Use GitHub's private vulnerability reporting flow when available:
https://github.com/bhogesararam23/ghost-app/security/advisories/new

When reporting a vulnerability, include the affected component/file, a clear description, reproduction steps, potential impact, a safe proof of concept when useful, and suggested mitigation when known.

Never include real private keys, passphrases, access tokens, or private message content.

## Security-sensitive areas

Treat changes involving cryptographic protocol logic, identity/key lifecycle, authentication/authorization, message encryption/decryption, token generation/validation, Supabase schema/RLS, recovery/device management, or metadata/retention behaviour as security-sensitive.

## Current known limitations

- no formal security audit
- no Double Ratchet-style forward secrecy
- encrypted key material relies on browser `localStorage`
- recovery logic is experimental
- metadata is not fully hidden
- protocol-level testing is incomplete

These limitations are tracked in the README roadmap.
