# Security And Privacy Considerations

## Document And Proof-Chain Verification

A DID document by itself is not a trusted mfid state. Trust-sensitive callers
must verify the document and proof-chain together with `verifyMfidProfile`.

## Key And Proof Material

The DID document stores active owner public keys as normalized P-256
`publicKeyJwk` values. Public keys are needed so verifiers can check owner
proof signatures without a private registry lookup. Private keys are never
stored by the package.

For `jwk.sign` owner proofs, the proof-chain stores:

- `verificationMethod`
- `challengeHash`
- `alg`
- `signature`

These fields are the minimum material needed to bind a signature to one owner
method, one document proof challenge, and the declared `ES256` algorithm. The
private JWK, key creation time, key label, device label, and key storage policy
are not mfid proof-chain material.

For `webauthn.get` owner proofs, the proof-chain stores:

- `verificationMethod`
- `challengeHash`
- `clientDataJSON`
- `authenticatorData`
- `signature`

These fields are required for independent WebAuthn assertion verification.

WebAuthn assertion fields may reveal RP hash, origin, UP/UV flags, and
signature counter behavior. Public proof-chains should be used for DID profile
creation/update, not as high-frequency authorization records.
`clientDataJSON.origin` is the most direct user-visible context in a WebAuthn
proof because it names the origin where the assertion was produced.
Credential IDs are stronger long-term correlation handles and are not mfid
proof-chain material. Products that need passkey discovery or account lookup
should store credential IDs in product credential records or encrypted keychain
metadata.

Other WebAuthn metadata such as user handles, credential IDs, transports,
attestation, AAGUID, PRF output, and authenticator extension output must not be
stored in the proof-chain. Authenticator extension output is rejected by default
because it can add fingerprinting surface; accepting it must be an explicit
caller choice.

## Time And Metadata Minimization

mfid v1 does not store creation time, update time, key creation time, or owner
method rotation time in the DID document or proof-chain core. These timestamps
are not required to verify the current mfid profile state: verification depends
on document hashes, proof-chain continuity, owner proof coverage, and proof
signatures.

Timestamps can reveal account age, key age, update cadence, rotation history,
and other correlation signals. Applications that need time-based policy should
store and disclose that metadata at the application layer instead of treating it
as mfid core verification material.

## Correlation

`did:mfid:<mfid>` is a stable public identifier. Reusing the same DID across
contexts can correlate activity. Applications should avoid publishing proof
material unnecessarily and should not use public proof-chains for routine
authorization events.

The owner mfid should not be used as a general public identifier outside the
personal owner network. Third-party services and applications should use
separate, app-specific profiles or aliases to reduce correlation, while the
owner mfid can serve as the user's personal security environment for protecting
and recovering those profiles.
