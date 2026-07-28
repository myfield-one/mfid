import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import {
  MFID_DOCUMENT_V1_SCHEMA,
  MFID_PROOF_CHAIN_V1_SCHEMA,
  canonicalJson,
  computeMfidDocumentChallengeHash,
  computeMfidDocumentHash,
  createMfidDocument,
  createMfidProofChain,
  deriveMfid,
  prepareMfidDocumentProof,
  updateMfidDocument,
  appendMfidProofChainEntry,
  verifyMfidProfile,
} from "../dist/index.js";

const GENESIS_PRIVATE_JWK = {
  key_ops: ["sign"],
  ext: true,
  kty: "EC",
  x: "7O4Re725rCeaBY2jMgTsUrzOeoMYaq-CdCJ-wpY-S0M",
  y: "t5f9mpY0B3IXW30XkPm-CYvU8vgsiL4BcHEkH9slEh4",
  crv: "P-256",
  d: "jeUrb9EhZZ-rHbPZZIiReFuDClgliqEwsqr5tlxbWAg",
};

const PASSKEY_PRIVATE_JWK = {
  key_ops: ["sign"],
  ext: true,
  kty: "EC",
  x: "s1Y5Xkw474FDN_PmEy_XrAJKOeHuqIjUqdKIu7__mZQ",
  y: "mZ3A4-XTqubNlX3deJUniKo4lyIaO5B0cokHNgzBOPo",
  crv: "P-256",
  d: "6pL8nkTXKAzLtcoJLr22XBjMePbNZEputPqWXSaj664",
};

const THIRD_PRIVATE_JWK = {
  key_ops: ["sign"],
  ext: true,
  kty: "EC",
  x: "HiObh2AkYIvHk94rgLT8NWxPIDDxJdfaEzRMknDqQS4",
  y: "kJyc10dsomWQdF6N6Rh9KswZkHnpdhepj1HTix2dpUU",
  crv: "P-256",
  d: "dIdDwexAydtvia7tzTOaZn-QigRr1hEQ_Axgi-ol3YA",
};

const VERIFY_OPTIONS = {
  webauthn: {
    allowedRpIds: ["myfield.one"],
    allowedOrigins: ["https://myfield.one"],
  },
  ownerProofPolicy: {
    createOwnerProofs: "first-owner-only",
  },
};

function publicJwk(privateJwk) {
  return {
    kty: privateJwk.kty,
    crv: privateJwk.crv,
    x: privateJwk.x,
    y: privateJwk.y,
  };
}

function bytesToB64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlToBytes(value) {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob((value + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function sha256Bytes(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

async function importPrivateKey(jwk) {
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function signJwkProof(document, methodId, privateJwk) {
  const challengeHash = await computeMfidDocumentChallengeHash(document);
  const key = await importPrivateKey(privateJwk);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(challengeHash)
  );
  return {
    type: "jwk.sign",
    verificationMethod: methodId,
    challengeHash,
    alg: "ES256",
    signature: bytesToB64url(new Uint8Array(signature)),
  };
}

async function signWebauthnProof(document, methodId, privateJwk, options = {}) {
  const challengeHash = await computeMfidDocumentChallengeHash(document);
  const challengeBytes = b64urlToBytes(bytesToB64url(hexToBytes(challengeHash)));
  const clientDataJSON = new TextEncoder().encode(
    JSON.stringify({
      type: "webauthn.get",
      challenge: bytesToB64url(challengeBytes),
      origin: options.origin || "https://myfield.one",
    })
  );
  const authData = new Uint8Array(37);
  authData.set(await sha256Bytes(new TextEncoder().encode(options.rpId || "myfield.one")), 0);
  authData[32] = options.flags ?? 0x05;
  const signedData = concatBytes(authData, await sha256Bytes(clientDataJSON));
  const key = await importPrivateKey(privateJwk);
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, signedData)
  );
  return {
    type: "webauthn.get",
    verificationMethod: methodId,
    challengeHash,
    clientDataJSON: bytesToB64url(clientDataJSON),
    authenticatorData: bytesToB64url(authData),
    signature: bytesToB64url(signature),
  };
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function rawEcdsaToDer(signature) {
  assert.equal(signature.length, 64);
  const r = derInteger(signature.slice(0, 32));
  const s = derInteger(signature.slice(32));
  const totalLength = 2 + r.length + 2 + s.length;
  return new Uint8Array([0x30, totalLength, 0x02, r.length, ...r, 0x02, s.length, ...s]);
}

function derInteger(value) {
  let bytes = value;
  while (bytes.length > 1 && bytes[0] === 0x00) bytes = bytes.slice(1);
  return (bytes[0] & 0x80) === 0x80 ? new Uint8Array([0x00, ...bytes]) : bytes;
}

async function buildOwnerUpdateProfile({ retainedPasskeyOnlyProof = false } = {}) {
  const v1 = await createMfidDocument({
    genesisOwner: { publicKeyJwk: publicJwk(GENESIS_PRIVATE_JWK) },
    additionalOwners: [{ publicKeyJwk: publicJwk(PASSKEY_PRIVATE_JWK) }],
  });
  const genesisProof = await signJwkProof(v1.document, v1.genesisOwnerMethodId, GENESIS_PRIVATE_JWK);
  const genesisChain = await createMfidProofChain({
    document: v1.document,
    ownerProofs: [genesisProof],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  const v2 = await updateMfidDocument({
    currentDocument: v1.document,
    currentProofChain: genesisChain.proofChain,
    nextOwners: [{ publicKeyJwk: publicJwk(PASSKEY_PRIVATE_JWK) }],
  });
  const passkeyMethodId = v2.document.authentication[0];
  const proofs = retainedPasskeyOnlyProof
    ? [await signWebauthnProof(v2.document, passkeyMethodId, PASSKEY_PRIVATE_JWK)]
    : [
        await signJwkProof(v2.document, v1.genesisOwnerMethodId, GENESIS_PRIVATE_JWK),
        await signWebauthnProof(v2.document, passkeyMethodId, PASSKEY_PRIVATE_JWK),
      ];
  const appended = await appendMfidProofChainEntry({
    previousProofChain: genesisChain.proofChain,
    document: v2.document,
    ownerProofs: proofs,
  });
  return { v1, genesisChain, v2, appended };
}

test("canonicalJson sorts object keys and rejects non-JSON values", () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), "{\"a\":{\"c\":3,\"d\":4},\"b\":2}");
  assert.throws(() => canonicalJson({ a: undefined }), /non-JSON/);
  assert.throws(() => canonicalJson({ a: Number.NaN }), /non-finite/);
});

test("createMfidDocument normalizes public owner keys and starts at owner-0", async () => {
  const created = await createMfidDocument({
    genesisOwner: { publicKeyJwk: publicJwk(GENESIS_PRIVATE_JWK) },
    additionalOwners: [{ publicKeyJwk: publicJwk(PASSKEY_PRIVATE_JWK) }],
  });
  assert.equal(created.ownerMethodIds[0], `${created.did}#owner-0`);
  assert.equal(created.ownerMethodIds[1], `${created.did}#owner-1`);
  assert.deepEqual(created.document.authentication, created.ownerMethodIds);
  assert.equal(await deriveMfid({ publicKeyJwk: publicJwk(GENESIS_PRIVATE_JWK) }), created.mfid);
  await assert.rejects(
    () => createMfidDocument({ genesisOwner: { publicKeyJwk: GENESIS_PRIVATE_JWK } }),
    /invalid publicKeyJwk/
  );
});

test("P-256 owner public keys must be valid curve points", async () => {
  const offCurveJwk = {
    ...publicJwk(GENESIS_PRIVATE_JWK),
    y: bytesToB64url(new Uint8Array(32)),
  };
  await assert.rejects(
    () => createMfidDocument({ genesisOwner: { publicKeyJwk: offCurveJwk } }),
    /invalid publicKeyJwk point/
  );
});

test("updateMfidDocument uses next-state owners and does not reuse historical owner ids", async () => {
  const v1 = await createMfidDocument({
    genesisOwner: { publicKeyJwk: publicJwk(GENESIS_PRIVATE_JWK) },
    additionalOwners: [{ publicKeyJwk: publicJwk(PASSKEY_PRIVATE_JWK) }],
  });
  const chain = await createMfidProofChain({
    document: v1.document,
    ownerProofs: [await signJwkProof(v1.document, v1.genesisOwnerMethodId, GENESIS_PRIVATE_JWK)],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  const v2 = await updateMfidDocument({
    currentDocument: v1.document,
    currentProofChain: chain.proofChain,
    nextOwners: [{ publicKeyJwk: publicJwk(PASSKEY_PRIVATE_JWK) }],
  });
  const appended = await appendMfidProofChainEntry({
    previousProofChain: chain.proofChain,
    document: v2.document,
    ownerProofs: [await signWebauthnProof(v2.document, v2.document.authentication[0], PASSKEY_PRIVATE_JWK)],
  });
  const v3 = await updateMfidDocument({
    currentDocument: v2.document,
    currentProofChain: appended.proofChain,
    nextOwners: [
      { publicKeyJwk: publicJwk(PASSKEY_PRIVATE_JWK) },
      { publicKeyJwk: publicJwk(GENESIS_PRIVATE_JWK) },
      { publicKeyJwk: publicJwk(THIRD_PRIVATE_JWK) },
    ],
  });
  assert.deepEqual(v3.addedOwnerMethodIds, [`${v1.did}#owner-2`, `${v1.did}#owner-3`]);
});

test("first-owner-only create proof-chain and owner update verify", async () => {
  const { v2, appended } = await buildOwnerUpdateProfile();
  assert.equal(v2.document.version, 2);
  assert.equal(v2.document.verificationMethod.length, 1);
  assert.equal(appended.proofChain.entries[1].proofs.some((proof) => proof.type === "webauthn.get" && !("credentialId" in proof)), true);
  const verified = await verifyMfidProfile(
    { didDocument: v2.document, proofChain: appended.proofChain },
    VERIFY_OPTIONS
  );
  assert.equal(verified.ok, true);
  assert.equal(verified.ok && verified.currentDocument.version, 2);
});

test("JWK owner proof verifier accepts DER and raw ECDSA signatures", async () => {
  const created = await createMfidDocument({
    genesisOwner: { publicKeyJwk: publicJwk(GENESIS_PRIVATE_JWK) },
  });
  const rawProof = await signJwkProof(created.document, created.genesisOwnerMethodId, GENESIS_PRIVATE_JWK);
  const derProof = {
    ...rawProof,
    signature: bytesToB64url(rawEcdsaToDer(b64urlToBytes(rawProof.signature))),
  };
  const rawChain = await createMfidProofChain({
    document: created.document,
    ownerProofs: [rawProof],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  const derChain = await createMfidProofChain({
    document: created.document,
    ownerProofs: [derProof],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  const options = {
    webauthn: {
      allowedRpIds: ["myfield.one"],
      allowedOrigins: ["https://myfield.one"],
    },
    ownerProofPolicy: { createOwnerProofs: "first-owner-only" },
  };
  assert.equal((await verifyMfidProfile({ didDocument: created.document, proofChain: rawChain.proofChain }, options)).ok, true);
  assert.equal((await verifyMfidProfile({ didDocument: created.document, proofChain: derChain.proofChain }, options)).ok, true);
});

test("retained passkey proof can satisfy previous and next owner coverage", async () => {
  const { v2, appended } = await buildOwnerUpdateProfile({
    retainedPasskeyOnlyProof: true,
  });
  assert.equal(appended.entry.proofs.length, 1);
  const verified = await verifyMfidProfile(
    { didDocument: v2.document, proofChain: appended.proofChain },
    VERIFY_OPTIONS
  );
  assert.equal(verified.ok, true);
});

test("WebAuthn proof verifies origin, RP, UV, and extension policy", async () => {
  const created = await createMfidDocument({
    genesisOwner: { publicKeyJwk: publicJwk(PASSKEY_PRIVATE_JWK) },
  });
  const proof = await signWebauthnProof(created.document, created.genesisOwnerMethodId, PASSKEY_PRIVATE_JWK);
  const chain = await createMfidProofChain({
    document: created.document,
    ownerProofs: [proof],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  assert.equal((await verifyMfidProfile({ didDocument: created.document, proofChain: chain.proofChain }, VERIFY_OPTIONS)).ok, true);

  const badOriginProof = await signWebauthnProof(created.document, created.genesisOwnerMethodId, PASSKEY_PRIVATE_JWK, {
    origin: "https://evil.example",
  });
  const badOriginChain = await createMfidProofChain({
    document: created.document,
    ownerProofs: [badOriginProof],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  const badOrigin = await verifyMfidProfile({ didDocument: created.document, proofChain: badOriginChain.proofChain }, VERIFY_OPTIONS);
  assert.equal(badOrigin.ok, false);
  assert.match(badOrigin.ok ? "" : badOrigin.error, /origin/);

  const noUvProof = await signWebauthnProof(created.document, created.genesisOwnerMethodId, PASSKEY_PRIVATE_JWK, {
    flags: 0x01,
  });
  const noUvChain = await createMfidProofChain({
    document: created.document,
    ownerProofs: [noUvProof],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  const noUv = await verifyMfidProfile({ didDocument: created.document, proofChain: noUvChain.proofChain }, VERIFY_OPTIONS);
  assert.equal(noUv.ok, false);
  assert.match(noUv.ok ? "" : noUv.error, /verification/);

  const extensionProof = await signWebauthnProof(created.document, created.genesisOwnerMethodId, PASSKEY_PRIVATE_JWK, {
    flags: 0x85,
  });
  const extensionChain = await createMfidProofChain({
    document: created.document,
    ownerProofs: [extensionProof],
    policy: { createOwnerProofs: "first-owner-only" },
  });
  const extensionRejected = await verifyMfidProfile(
    { didDocument: created.document, proofChain: extensionChain.proofChain },
    VERIFY_OPTIONS
  );
  assert.equal(extensionRejected.ok, false);
  assert.match(extensionRejected.ok ? "" : extensionRejected.error, /extensions/);
});

test("profile verifier rejects schema mismatch and missing WebAuthn proof material", async () => {
  const { v2, appended } = await buildOwnerUpdateProfile();
  const schemaMismatch = await verifyMfidProfile(
    {
      didDocument: { ...v2.document, $schema: "https://myfield.one/v1/schemas/did-document.json" },
      proofChain: appended.proofChain,
    },
    VERIFY_OPTIONS
  );
  assert.equal(schemaMismatch.ok, false);
  const withoutSignature = structuredClone(appended.proofChain);
  delete withoutSignature.entries[1].proofs[1].signature;
  const signatureRejected = await verifyMfidProfile(
    { didDocument: v2.document, proofChain: withoutSignature },
    VERIFY_OPTIONS
  );
  assert.equal(signatureRejected.ok, false);
  assert.match(signatureRejected.ok ? "" : signatureRejected.error, /signature/);
});

test("document hash and challenge hash use separate domain-separated payloads", async () => {
  const created = await createMfidDocument({
    genesisOwner: { publicKeyJwk: publicJwk(GENESIS_PRIVATE_JWK) },
  });
  const prepared = await prepareMfidDocumentProof(created.document);
  assert.equal(prepared.documentHash, await computeMfidDocumentHash(created.document));
  assert.notEqual(prepared.documentHash, prepared.challengeHash);
  assert.deepEqual(prepared.proofPayload, {
    type: "mfid.document-proof.v1",
    did: created.did,
    version: 1,
    documentHash: prepared.documentHash,
  });
});

test("schema files match exported schema constants", () => {
  const packageDocumentSchema = JSON.parse(readFileSync(new URL("../schemas/mfid-document.schema.json", import.meta.url), "utf8"));
  const packageProofChainSchema = JSON.parse(readFileSync(new URL("../schemas/mfid-proof-chain.schema.json", import.meta.url), "utf8"));
  assert.deepEqual(packageDocumentSchema, MFID_DOCUMENT_V1_SCHEMA);
  assert.deepEqual(packageProofChainSchema, MFID_PROOF_CHAIN_V1_SCHEMA);
});

test("test vectors are parseable and keep WebAuthn credentialId outside the proof-chain", () => {
  const vectorDir = new URL("../test-vectors/", import.meta.url);
  const files = readdirSync(vectorDir).filter((file) => file.endsWith(".json"));
  assert.deepEqual(files.sort(), [
    "document-v1-create.json",
    "document-v1-proof.json",
    "proof-chain-create.json",
    "proof-chain-update.json",
    "webauthn-proof.json",
  ]);
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(new URL(file, vectorDir), "utf8"));
    assert.equal(typeof parsed.name, "string");
  }
  const webauthn = JSON.parse(readFileSync(new URL("webauthn-proof.json", vectorDir), "utf8"));
  assert.equal("credentialId" in webauthn.proof, false);
});
