import {
  computeMfidDocumentChallengeHash,
  createMfidDocument,
  createMfidProofChain,
  verifyMfidProfile,
} from "../dist/index.js";

const printProfile = process.env.MFID_EXAMPLE_PRINT_PROFILE === "1";

function bytesToBase64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

const keyPair = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"]
);

const exportedPublicJwk = await crypto.subtle.exportKey(
  "jwk",
  keyPair.publicKey
);
const publicKeyJwk = {
  kty: exportedPublicJwk.kty,
  crv: exportedPublicJwk.crv,
  x: exportedPublicJwk.x,
  y: exportedPublicJwk.y,
};

const created = await createMfidDocument({
  genesisOwner: { publicKeyJwk },
});

const challengeHash = await computeMfidDocumentChallengeHash(created.document);
const signature = await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" },
  keyPair.privateKey,
  new TextEncoder().encode(challengeHash)
);

const proofChain = await createMfidProofChain({
  document: created.document,
  ownerProofs: [
    {
      type: "jwk.sign",
      verificationMethod: created.genesisOwnerMethodId,
      challengeHash,
      alg: "ES256",
      signature: bytesToBase64url(new Uint8Array(signature)),
    },
  ],
  policy: { createOwnerProofs: "all-owners" },
});

const verified = await verifyMfidProfile(
  { didDocument: created.document, proofChain: proofChain.proofChain },
  {
    webauthn: { allowedRpIds: [], allowedOrigins: [] },
    ownerProofPolicy: { createOwnerProofs: "all-owners" },
  }
);

if (!verified.ok) throw new Error(verified.error);

if (printProfile) {
  console.log(
    JSON.stringify(
      { didDocument: created.document, proofChain: proofChain.proofChain },
      null,
      2
    )
  );
}

console.log(
  JSON.stringify(
    {
      verified: true,
      did: verified.did,
      documentHash: verified.documentHash,
      chainHeadHash: verified.chainHeadHash,
    },
    null,
    2
  )
);
