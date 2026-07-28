# mfid Document Profile v1

## Schema

The DID document schema id is:

```text
https://myfield.one/v1/schemas/mfid-document.json
```

The package source schema is `schemas/mfid-document.schema.json`, checked
against the exported schema constant by this package's own tests.

## Context

The v1 profile includes DID Core context and an mfid v1 context URL. The package
does not fetch remote context documents during verification; hashes and
signatures use deterministic JSON over the concrete document object.

## Identifier Derivation

`deriveMfid(publicKeyJwk)` derives the mfid from the normalized genesis owner
public JWK. The resulting DID is `did:mfid:<mfid>`. The private key for the
genesis owner is not part of the identifier and must not be persisted by this
package.

v1 requires a normalized P-256 public JWK (`kty`, `crv`, `x`, `y`). The `<mfid>`
is the first 32 lowercase hex characters of `SHA-256(x || y)`, where `x` and
`y` are the decoded base64url coordinate bytes.

Only the genesis owner public key derives the identifier. Later owner updates
do not change the DID and do not need to derive the same mfid.

## Verification Methods

v1 verification methods use:

- `type`: `JsonWebKey2020`
- `controller`: the DID itself
- `publicKeyJwk`: normalized P-256 public JWK material

Owner ids are allocated as `#owner-0`, `#owner-1`, and so on. New owner ids are
monotonic and must not reuse any owner id that has appeared in the proof-chain
history. The first owner id is `#owner-0`.

## Algorithm Support

mfid v1 defines one owner key family:

- JWK key type: `EC`
- JWK curve: `P-256`
- Verification method type: `JsonWebKey2020`

For `jwk.sign` owner proofs, v1 defines:

- `alg`: `ES256`
- signing input: the document proof challenge hash encoded as UTF-8

For `webauthn.get` owner proofs, the signature algorithm is determined by the
owner method's P-256 public JWK. The proof stores WebAuthn assertion material,
not a separate `alg` field.

Future algorithm support can reuse the existing algorithm-bearing fields, such
as `publicKeyJwk.kty`, `publicKeyJwk.crv`, verification method `type`, and
`jwk.sign.alg`. Adding a new accepted algorithm still requires an explicit
profile, schema, and verifier revision. Callers must not treat unknown
verification method types, JWK curves, or proof algorithms as valid mfid v1
material.

## Verification Relationships

In v1, each active owner method is listed in:

- `authentication`
- `capabilityInvocation`
- `assertionMethod`

This simplifies owner management and lets owner proofs use one active owner
set. Future profile revisions may split these relationships or add
purpose-specific verification relationships. Callers must not infer that every
future mfid profile will use the same relationship set.

## Versioning

`version` is a monotonic number. The package verifies linear proof-chain
continuity as defined by [mfid proof-chain v1](mfid-proof-chain-v1.md).

## Hashes

Document hashes and proof challenge hashes are domain-separated. Use
`computeMfidDocumentHash` for document identity and
`computeMfidDocumentChallengeHash` for owner proof challenges.
