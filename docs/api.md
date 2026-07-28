# TypeScript API

The package exports pure helpers. It does not perform network I/O, storage, UI,
or account registration.

## Document Helpers

- `createMfidDocument(input)`
- `updateMfidDocument(input)`
- `prepareMfidDocumentProof(document)`
- `deriveMfid(publicKeyJwk)`
- `computeMfidDocumentHash(document)`
- `computeMfidDocumentChallengeHash(document)`

`createMfidDocument` allocates owner ids and returns the DID, mfid, document,
and genesis owner method id. `updateMfidDocument` builds the next document but
does not decide product authorization policy.

## Proof-Chain Helpers

- `createMfidProofChain(input)`
- `appendMfidProofChainEntry(input)`
- `verifyMfidProfile(profile, options)`

`createMfidProofChain` requires caller-supplied owner proofs and an explicit
creation policy. `appendMfidProofChainEntry` requires proofs for the new
document state and verifies continuity against the previous chain.

## WebAuthn Verification Options

`verifyMfidProfile` requires:

- `webauthn.allowedRpIds`
- `webauthn.allowedOrigins`
- `ownerProofPolicy.createOwnerProofs`

Authenticator extension data is rejected by default. Set
`allowAuthenticatorExtensions: true` only when the caller has a documented
reason to accept extension output.

## Canonical JSON

- `canonicalJson(value)`
- `sha256Hex(value)`

Only JSON-compatible values are accepted. Object keys are sorted
deterministically.

## Schema Constants

- `MFID_DOCUMENT_V1_SCHEMA_ID`
- `MFID_PROOF_CHAIN_V1_SCHEMA_ID`
- `MFID_DOCUMENT_V1_SCHEMA`
- `MFID_PROOF_CHAIN_V1_SCHEMA`

The schema constants are the source for package schemas and API schema
snapshots.

## Errors

The public API throws `Error` for construction failures and returns structured
verification failures from `verifyMfidProfile`. Callers should not match thrown
message text as a stable compatibility contract.
