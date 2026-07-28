# mfid

`mfid` is the `did:mfid` v1 DID method/profile package.

Status: 1.0 preview. `0.9.0` reflects our assessment that the v1 design has
reached its baseline shape; minor adjustments are still possible before 1.0
based on community feedback and real-world use, and 1.0 will freeze the
API/protocol, with later versions extending it while keeping compatibility.

## Purpose

mfid provides a DID profile for identities owned by control of active owner
private keys, typically generated and held by user devices or authenticators,
without requiring a central registry. The identifier is derived from the
genesis owner key, while the current trusted state is proven by a DID document
and proof-chain verified together.

An mfid profile can rotate owner keys without changing its DID. A DID document
is trusted only when it verifies against its proof-chain. Applications can
build registration and authorization flows on top of mfid, while
product-specific policy remains outside the DID method core.

mfid v1 is intended to serve as a personal security root for a user's network of
owner devices. It is not intended to be used as a public identifier
across applications or third-party services.

## What Is In Scope

- `did:mfid:<mfid>` v1 identifier derivation and DID document creation.
- A narrow DID Core-compatible document profile using `JsonWebKey2020` and
  `publicKeyJwk`.
- Method-specific proof-chain creation, append, and verification.
- Deterministic JSON and hash helpers used by the v1 profile.
- Owner proof verification for `jwk.sign` and `webauthn.get`.
- JSON schema snapshots and cross-implementation test vectors.

## What Is Out Of Scope

- Product registration policy, bootstrap artifacts, grants, sessions, and UI.
- Resolver hosting, registry writes, and network transport.

## Usage

This package is not yet published to a registry. For API usage, read the
runnable example below — it covers document creation, genesis proof-chain
creation, and profile verification end to end. See [docs/api.md](docs/api.md)
for the full helper list.

## Minimal Example

The runnable minimal example creates a P-256 owner key, creates an mfid DID
document, signs the genesis document proof, creates a proof-chain, and verifies
the resulting profile.

```sh
npm run example:minimal
```

The command prints a JSON object with `verified: true`, the generated DID,
document hash, and proof-chain head hash.

To also print the generated profile before the verification result:

```sh
MFID_EXAMPLE_PRINT_PROFILE=1 npm run example:minimal
```

Source: [examples/minimal.mjs](examples/minimal.mjs).

## Documentation

Specification:

- [DID method specification](docs/mfid-did-method-spec.md)
- [mfid document profile v1](docs/mfid-document-profile-v1.md)
- [mfid proof-chain v1](docs/mfid-proof-chain-v1.md)

Reference:

- [TypeScript API](docs/api.md)
- [Test vectors](docs/test-vectors.md)

Considerations:

- [Security and privacy](docs/security-privacy.md)
