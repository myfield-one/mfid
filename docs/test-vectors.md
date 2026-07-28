# Test Vectors

Test vectors live in `test-vectors/` and are intended for cross-implementation
checks.

## Files

- `document-v1-create.json`: genesis document creation fixture.
- `document-v1-proof.json`: document proof payload and challenge hash fixture.
- `proof-chain-create.json`: genesis proof-chain fixture.
- `proof-chain-update.json`: owner update fixture.
- `webauthn-proof.json`: WebAuthn owner proof fixture.

## Regeneration

Vectors are produced by the package tests and should be updated together with
implementation changes. Run:

```sh
npm run test
```

## Compatibility Notes

The vectors cover the mfid v1 DID document and proof-chain profile. Product
registration policy and application authorization records are outside this
package.
