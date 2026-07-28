# mfid Proof-Chain v1

The proof-chain is the append-only history that proves how an mfid DID document
reached its current state. Each entry stores a full document snapshot, hashes
that link it to the previous entry, and owner proofs that authorize creation or
update. mfid trust depends on verifying the current DID document together with
the full proof-chain.

The proof-chain is method-specific verification data, not an on-chain or
blockchain ledger. It is not embedded in the DID document because DID Core does
not require DID documents to be signed. Storage, publication, and
synchronization are product concerns outside the mfid v1 proof-chain rules.

## Schema

The proof-chain schema id is:

```text
https://myfield.one/v1/schemas/mfid-proof-chain.json
```

The package source schema is `schemas/mfid-proof-chain.schema.json`, checked
against the exported schema constant by this package's own tests.

## Entry Shape

Each entry stores:

- `version`
- full `document` snapshot
- `proofs`
- `documentHash`
- `chainHash`
- previous document and chain hashes for non-genesis entries

The full document snapshot makes each historical state independently
verifiable.

## Genesis Coverage

Genesis creation supports explicit policies:

- `all-owners`
- `first-owner-only`

The policy is selected by the caller and must be passed to verification. This is
a product policy choice, not a hidden verifier default.

v1 key governance uses an at-least-one-owner policy. Multi-owner quorum,
threshold, or joint-governance rules are future extensions.

## Update Coverage

Update entries must prove continuity from the previous owner set. At least one
current owner proof and one next-state owner proof are mandatory. A retained
owner proof may satisfy both current and next-state owner coverage.

## Forks And Merge

v1 proof-chains are linear and do not support fork or merge. Each non-genesis
entry points to the previous entry with `prevDocumentHash` and `prevChainHash`,
and `chainHeadHash` must match the last entry's `chainHash`.

Fork choice, conflict resolution, and merge policy are future extensions, not
mfid v1 proof-chain rules.

## Owner Proofs

`jwk.sign` signs the document proof challenge hash with an owner private key.

`webauthn.get` stores the minimum assertion material required for independent
verification:

- `clientDataJSON`
- `authenticatorData`
- `signature`
- `challengeHash`
