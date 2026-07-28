# Contributing

`mfid` is a DID method/profile spec plus a reference TypeScript
implementation. Contributions from independent implementers are welcome,
especially cross-implementation test vectors and spec clarifications.

## Before You Start

For anything beyond a small fix (typos, obvious bugs), please open an issue
first to discuss the change. Changes to the DID document profile or
proof-chain rules affect the method specification, not just this package, so
they need discussion before a PR.

## Development

```sh
npm install
npm run typecheck
npm test
```

`npm test` also regenerates nothing automatically: if you change
`schemas/*.schema.json` or the exported schema constants in `src/index.ts`,
keep them in sync — the test suite asserts they match.

## Test Vectors

Test vectors in `test-vectors/` are meant for cross-implementation checks.
If you add or change a vector, make sure:

- It is produced by (or verified against) this package's own implementation.
- It does not include material the spec says must not be stored (see
  `docs/security-privacy.md`), e.g. WebAuthn `credentialId`, timestamps, or
  private key material.

## License

By contributing, you agree that your contributions will be licensed under
the Apache License 2.0 (see `LICENSE`).
