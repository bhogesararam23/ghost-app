# Contributing to Ghost Network

Thank you for considering contributing to Ghost Network! This document provides guidelines for contributing to this privacy-focused messaging application.

## Code of Conduct

- Be respectful and professional
- Focus on constructive feedback
- Prioritize security and privacy in all contributions
- Follow the existing code style and patterns

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Basic understanding of end-to-end encryption concepts

### Setup

1. Fork and clone the repository
2. Copy `.env.example` to `.env.local` and configure your Supabase credentials
3. Install dependencies: `npm install`
4. Run the development server: `npm run dev`

## Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Code is automatically formatted with Next.js defaults
- **Naming**: Use descriptive names for variables and functions
  - Components: PascalCase (e.g., `ErrorBoundary`)
  - Functions: camelCase (e.g., `validateTokenId`)
  - Constants: UPPER_SNAKE_CASE (e.g., `TOKEN_ALPHABET`)

### Security Considerations

**Critical**: This is a privacy and security-focused application. All contributions must:

1. **Never** log sensitive data (private keys, passphrases, decrypted messages)
2. **Never** transmit unencrypted message content to the server
3. **Always** validate user input before processing
4. **Always** use constant-time comparisons for cryptographic operations
5. **Never** store private keys in plaintext

### Component Guidelines

- Use functional components with hooks
- Keep components focused and single-purpose
- Add proper ARIA labels for accessibility
- Handle loading and error states explicitly
- Use the toast system for user feedback

### Testing

Before submitting changes:

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Build to verify TypeScript compilation
npm run build
```

Write tests for:
- All utility functions (crypto, validation, etc.)
- Critical business logic
- Edge cases and error scenarios

## Pull Request Process

1. **Branch Naming**: Use descriptive branch names
   - Feature: `feature/token-validation`
   - Bug fix: `fix/handshake-timeout`
   - Security: `security/xss-prevention`

2. **Commit Messages**: Write clear, concise commit messages
   - Format: `type: brief description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `security`
   - Example: `feat: add passphrase strength indicator`

3. **Pull Request Description**:
   - Describe what changed and why
   - Reference related issues
   - Include screenshots for UI changes
   - List any breaking changes

4. **Review Process**:
   - All PRs require review before merging
   - Address review feedback promptly
   - Keep PRs focused and reasonably sized

## Areas for Contribution

### High Priority

- Security enhancements and audits
- Accessibility improvements
- Test coverage expansion
- Documentation improvements

### Feature Ideas

- Double ratchet algorithm for forward secrecy
- QR code scanning for Token ID exchange
- Multi-device support
- Message expiration improvements

### Known Limitations

- No forward secrecy (session keys don't rotate)
- Recovery phrase system is simplified
- No message read receipts
- Limited mobile optimization

## Security Reporting

**Do NOT** open public issues for security vulnerabilities.

If you discover a security issue:
1. Email the maintainers privately (check README for contact)
2. Provide detailed reproduction steps
3. Wait for acknowledgment before public disclosure

## Questions?

Feel free to open a GitHub Discussion for:
- Architecture questions
- Feature proposals
- General questions about the codebase

Thank you for contributing to Ghost Network! 👻
