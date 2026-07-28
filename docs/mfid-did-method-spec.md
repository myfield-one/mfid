# did:mfid Method Specification

`did:mfid` is a DID method profile. This package implements the v1
profile and its proof-chain verification primitives. See the
[package README](../README.md) for current package status.

## Method Name

The DID method name is `mfid`.

## Specification Components

- [mfid document profile v1](mfid-document-profile-v1.md): DID document
  profile, identifier derivation, owner method rules, algorithm support, and
  document hashes.
- [mfid proof-chain v1](mfid-proof-chain-v1.md): proof-chain entry shape,
  owner proof coverage, append rules, and chain-head verification.

## Trust Model

mfid v1 is designed for identities controlled by owner keys that may change over
time. The method does not require a central registry or account record to decide
initial ownership.

mfid v1 is scoped to a personal owner network. Owner authority belongs only to
user-controlled devices that hold owner keys and can produce owner proofs.
Devices, transports, or storage nodes that do not hold owner keys may store,
relay, or sync mfid profiles, but they are not owners or authorities.

Because transport and storage are not trusted for freshness, clients and
trust-sensitive callers must remember the latest accepted version and chain-head
hash for each DID and reject stale, rolled-back, or non-descendant states.

An mfid profile is self-contained for verification: verifiers can validate the
supplied identity state from the DID document, proof-chain, and owner proofs
without relying on an external platform, registry, or account service.

The mfid identifier is derived from the genesis owner public key. A DID document
is not trusted by shape alone: verifiers must validate the document together
with its proof-chain.

The genesis proof-chain entry binds `did:mfid:<mfid>` to `#owner-0` by checking
that `deriveMfid(owner-0.publicKeyJwk) === <mfid>`. Later entries keep the same
DID and prove state continuity with document hashes, previous chain hashes, and
owner proofs from the previous and next owner sets.

A verifier accepts the current profile only when the supplied DID document
matches the proof-chain head.

## DID Syntax

An mfid DID has the form:

```text
did:mfid:<mfid>
```

`<mfid>` is derived from the genesis owner public key using the deterministic
derivation rule defined by the v1 document profile. The package's `deriveMfid`
helper implements that rule.

## DID Document Profile

The v1 document is a narrow DID Core-compatible profile:

- `$schema`: `https://myfield.one/v1/schemas/mfid-document.json`
- `@context`: includes the DID Core context and the v1 mfid context URL.
- `id`: the full `did:mfid:<mfid>` DID.
- `verificationMethod`: owner methods only in v1.
- `authentication`, `capabilityInvocation`, and `assertionMethod`: active owner
  relationships.
- `version`: a monotonic document version number.

v1 uses `JsonWebKey2020` verification methods with P-256 `publicKeyJwk`
material. See [mfid document profile v1](mfid-document-profile-v1.md) for the
current algorithm support and extension boundary.

## Method Operations

### Create

Creation builds a genesis DID document and a genesis proof-chain entry. Product
callers decide whether every genesis owner must sign or whether the first owner
proof is enough. Both policies are supported by the verifier when explicitly
selected.

### Update

Update builds the next DID document from a current document and proof-chain.
mfid v1 uses a personal default owner update policy: one current owner proof plus
one next-state owner proof. Stronger governance models, including
protected owners, threshold approval, recovery, and organization policies, may be
added by future extensions.

### Deactivate

v1 does not define a deactivation operation. Deactivation may be added by a
future extension.

### Recover

v1 does not define a separate recovery operation. Practical recovery uses
multiple owner keys so a remaining active owner can rotate the document through
the normal update path. Other recovery policies may be added by future
extensions.

## Resolution Boundary

The package does not host a resolver. A resolver may return the current DID
document as the DID resolution result and expose the proof-chain as
method-specific metadata or through a profile API. Trust-sensitive callers must
verify the DID document together with its proof-chain.

The mfid verifier checks validity, not freshness. Anti-rollback is enforced by
the storage, sync, resolver, or client state that accepts a profile.

## Security And Privacy

See [security-privacy.md](security-privacy.md).
