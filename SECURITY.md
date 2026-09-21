# Security Policy

## Status

Ghost Network is an experimental privacy focused student project.

It uses established cryptographic primitives, but the complete application and protocol have not been formally security audited.

Please do not use the current prototype for high risk communications or assume that it provides production grade anonymity.

## Supported versions

The latest version on the `master` branch is the primary development version.

Older commits and branches are generally not security supported.

## Reporting a vulnerability

Please do not open a public GitHub issue for a suspected security vulnerability.

Use GitHub's private vulnerability reporting flow for this repository when available.

When reporting a vulnerability, include:

- a clear description of the issue
- affected component or file
- reproduction steps
- possible impact
- any proof of concept that is safe to share
- suggested mitigation if you have one

Please avoid including real private keys, passphrases, private messages or other sensitive user data.

## Security principles

Changes involving cryptography, identity, authentication, message handling or Supabase RLS should be treated as security sensitive.

In particular:

- never log private keys or passphrases
- never send plaintext message content to the backend
- do not weaken encryption just to simplify implementation
- do not store private keys in plaintext
- review RLS changes carefully
- add regression tests for security fixes

## Current known limitations

The project currently has known prototype limitations including:

- no formal security audit
- no Double Ratchet style forward secrecy yet
- encrypted key material currently relies on browser localStorage
- simplified prototype recovery logic
- remaining metadata exposure
- incomplete protocol level testing

These limitations are tracked in the roadmap in the README.
