# Changelog

## 0.9.0

First public release.

- `did:mfid` v1 DID document profile: identifier derivation from the genesis
  owner P-256 public key, `JsonWebKey2020` verification methods, monotonic
  document versioning.
- v1 proof-chain: genesis creation (`all-owners` / `first-owner-only`
  policy), owner updates (current + next-state owner proof coverage),
  linear chain-head verification.
- Owner proof verification for `jwk.sign` (ES256) and `webauthn.get`.
- Deterministic JSON and hashing helpers (`canonicalJson`, `sha256Hex`,
  document/challenge hashes).
- JSON schemas and cross-implementation test vectors for the v1 document
  and proof-chain profile.
- Minimal example (`examples/minimal.mjs`) with optional
  `MFID_EXAMPLE_PRINT_PROFILE=1` support to print the generated profile
  before the verification result.
