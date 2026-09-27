# Contributing to Ghost Network

Thank you for considering a contribution to Ghost Network.

Ghost Network is a security- and privacy-focused experimental project. Changes that affect cryptography, identity, authentication, message handling, or database access deserve extra review.

## Before you start

Read [README.md](README.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and [SECURITY.md](SECURITY.md).

For large protocol or architecture changes, open an issue or discussion before implementing the change.

## Local development

### Prerequisites

- Node.js 20+
- npm
- a Supabase project for application-level development

### Setup

1. Fork and clone the repository.
2. Configure the required public Supabase environment variables in `.env.local`.
3. Install dependencies with `npm ci`.
4. Start the development server with `npm run dev`.

## Quality checks

Before opening a pull request, run:

```bash
npm run lint
npm test -- --run
npm run build
```

CI runs the same checks on pushes to `master` and on pull requests.

## Security-sensitive changes

For crypto, identity, authentication, RLS, or message-handling changes, explain in the pull request which keys or trust relationships are affected, where sensitive material exists, what the server can and cannot see, how recovery is handled, whether compatibility changes, whether security properties change, and which tests cover the change.

Do not include real secrets, private keys, passphrases, or private message content in commits, issues, or pull requests.

## Coding guidelines

- Use TypeScript for application code.
- Prefer small, focused modules.
- Keep cryptographic operations isolated from UI concerns.
- Validate external input.
- Handle loading and error states explicitly.
- Preserve accessibility semantics and keyboard navigation.
- Document security trade-offs instead of silently weakening properties.

## Branch naming

Use descriptive names such as `feature/<name>`, `fix/<name>`, `security/<name>`, `refactor/<name>`, `docs/<name>`, or `test/<name>`.

## Commit messages

Use `type: short description`, for example `feat: add message retry handling` or `security: tighten message row policy`.

## Pull requests

Keep pull requests focused and reasonably sized. Include what changed, why it changed, how it was tested, security/privacy impact, UI screenshots when useful, and migration or compatibility notes when relevant.
