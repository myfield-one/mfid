export const MFID_DOCUMENT_V1_SCHEMA_ID = "https://myfield.one/v1/schemas/mfid-document.json";
export const MFID_PROOF_CHAIN_V1_SCHEMA_ID = "https://myfield.one/v1/schemas/mfid-proof-chain.json";

export const MFID_CONTEXT_V1 = [
  "https://www.w3.org/ns/did/v1",
  "https://w3id.org/security/suites/jws-2020/v1",
] as const;

export type MfidProfileVersion = "mfid-v1";
export type MfidCreateOwnerProofPolicy = "first-owner-only" | "all-owners";
export type ValidationResult = { ok: true } | { ok: false; error: string };

export type MfidOwnerKeyInput = {
  publicKeyJwk: JsonWebKey;
};

export type MfidVerificationMethodV1 = {
  id: string;
  type: "JsonWebKey2020";
  controller: string;
  publicKeyJwk: JsonWebKey;
};

export type MfidDocumentV1 = {
  $schema: typeof MFID_DOCUMENT_V1_SCHEMA_ID;
  "@context": string[];
  id: string;
  verificationMethod: MfidVerificationMethodV1[];
  authentication: string[];
  capabilityInvocation: string[];
  assertionMethod: string[];
  version: number;
};

export type MfidDocumentProofPayloadV1 = {
  type: "mfid.document-proof.v1";
  did: string;
  version: number;
  documentHash: string;
};

export type MfidJwkOwnerProofV1 = {
  type: "jwk.sign";
  verificationMethod: string;
  challengeHash: string;
  alg: "ES256";
  signature: string;
};

export type MfidWebauthnOwnerProofV1 = {
  type: "webauthn.get";
  verificationMethod: string;
  challengeHash: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
};

export type MfidOwnerProofV1 = MfidJwkOwnerProofV1 | MfidWebauthnOwnerProofV1;

export type MfidProofChainEntryV1 = {
  version: number;
  document: MfidDocumentV1;
  proofs: MfidOwnerProofV1[];
  prevDocumentHash?: string;
  documentHash: string;
  prevChainHash?: string;
  chainHash: string;
};

export type MfidProofChainV1 = {
  $schema: typeof MFID_PROOF_CHAIN_V1_SCHEMA_ID;
  did: string;
  entries: MfidProofChainEntryV1[];
  chainHeadHash: string;
};

export type VerifyMfidProfileOptions = {
  webauthn: {
    allowedRpIds: string[];
    allowedOrigins: string[];
    allowAuthenticatorExtensions?: boolean;
  };
  ownerProofPolicy: {
    createOwnerProofs: MfidCreateOwnerProofPolicy;
  };
};

export type VerifyMfidProfileResult =
  | {
      ok: true;
      did: string;
      mfid: string;
      currentDocument: MfidDocumentV1;
      documentHash: string;
      chainHeadHash: string;
      ownerMethods: MfidVerificationMethodV1[];
    }
  | { ok: false; code: string; error: string };

const PUBLIC_P256_JWK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kty", "crv", "x", "y"],
  properties: {
    kty: { const: "EC" },
    crv: { const: "P-256" },
    x: { type: "string" },
    y: { type: "string" },
  },
} as const;

const MFID_OWNER_PROOF_SCHEMA = {
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "verificationMethod", "challengeHash", "clientDataJSON", "authenticatorData", "signature"],
      properties: {
        type: { const: "webauthn.get" },
        verificationMethod: { type: "string" },
        challengeHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
        clientDataJSON: { type: "string" },
        authenticatorData: { type: "string" },
        signature: { type: "string" },
      },
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "verificationMethod", "challengeHash", "alg", "signature"],
      properties: {
        type: { const: "jwk.sign" },
        verificationMethod: { type: "string" },
        challengeHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
        alg: { const: "ES256" },
        signature: { type: "string" },
      },
    },
  ],
} as const;

const MFID_DOCUMENT_SCHEMA_CORE = {
  type: "object",
  additionalProperties: false,
  required: [
    "$schema",
    "@context",
    "id",
    "verificationMethod",
    "authentication",
    "capabilityInvocation",
    "assertionMethod",
    "version",
  ],
  properties: {
    $schema: { const: MFID_DOCUMENT_V1_SCHEMA_ID },
    "@context": {
      type: "array",
      prefixItems: MFID_CONTEXT_V1.map((value) => ({ const: value })),
      items: false,
      minItems: MFID_CONTEXT_V1.length,
      maxItems: MFID_CONTEXT_V1.length,
    },
    id: { type: "string", pattern: "^did:mfid:[a-f0-9]{32}$" },
    verificationMethod: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "controller", "publicKeyJwk"],
        properties: {
          id: { type: "string", pattern: "^did:mfid:[a-f0-9]{32}#owner-(?:0|[1-9][0-9]*)$" },
          type: { const: "JsonWebKey2020" },
          controller: { type: "string" },
          publicKeyJwk: PUBLIC_P256_JWK_SCHEMA,
        },
      },
    },
    authentication: { type: "array", items: { type: "string" }, minItems: 1 },
    capabilityInvocation: { type: "array", items: { type: "string" }, minItems: 1 },
    assertionMethod: { type: "array", items: { type: "string" }, minItems: 1 },
    version: { type: "integer", minimum: 1 },
  },
} as const;

export const MFID_DOCUMENT_V1_SCHEMA = {
  $id: MFID_DOCUMENT_V1_SCHEMA_ID,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  ...MFID_DOCUMENT_SCHEMA_CORE,
} as const;

export const MFID_PROOF_CHAIN_V1_SCHEMA = {
  $id: MFID_PROOF_CHAIN_V1_SCHEMA_ID,
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["$schema", "did", "entries", "chainHeadHash"],
  properties: {
    $schema: { const: MFID_PROOF_CHAIN_V1_SCHEMA_ID },
    did: { type: "string", pattern: "^did:mfid:[a-f0-9]{32}$" },
    entries: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["version", "document", "proofs", "documentHash", "chainHash"],
        properties: {
          version: { type: "integer", minimum: 1 },
          document: MFID_DOCUMENT_SCHEMA_CORE,
          proofs: { type: "array", minItems: 1, items: MFID_OWNER_PROOF_SCHEMA },
          prevDocumentHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
          documentHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
          prevChainHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
          chainHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
        },
      },
    },
    chainHeadHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
} as const;

export function isValidMfid(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
}

export function parseMfid(did: string): string | null {
  const safe = String(did || "").trim();
  const prefix = "did:mfid:";
  if (!safe.startsWith(prefix)) return null;
  const mfid = safe.slice(prefix.length);
  return isValidMfid(mfid) ? mfid : null;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJsonStrict(value));
}

export async function sha256Hex(bytesOrText: Uint8Array | ArrayBuffer | string): Promise<string> {
  const data =
    typeof bytesOrText === "string"
      ? new TextEncoder().encode(bytesOrText)
      : bytesOrText instanceof Uint8Array
        ? bytesOrText
        : new Uint8Array(bytesOrText);
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  return bytesToHex(new Uint8Array(digest));
}

export async function computeMfidDocumentHash(document: MfidDocumentV1): Promise<string> {
  return sha256Hex(canonicalJson(document));
}

export async function computeMfidDocumentProofPayload(document: MfidDocumentV1): Promise<MfidDocumentProofPayloadV1> {
  return {
    type: "mfid.document-proof.v1",
    did: document.id,
    version: document.version,
    documentHash: await computeMfidDocumentHash(document),
  };
}

export async function computeMfidDocumentChallengeHash(document: MfidDocumentV1): Promise<string> {
  return sha256Hex(canonicalJson(await computeMfidDocumentProofPayload(document)));
}

export async function computeMfidProofChainEntryHash(entryCore: Omit<MfidProofChainEntryV1, "chainHash">): Promise<string> {
  return sha256Hex(canonicalJson(entryCore));
}

export async function deriveMfid(ownerKey: MfidOwnerKeyInput): Promise<string> {
  const publicJwk = normalizePublicP256Jwk(ownerKey.publicKeyJwk);
  const x = b64urlToBytes(String(publicJwk.x));
  const y = b64urlToBytes(String(publicJwk.y));
  const combined = new Uint8Array(x.length + y.length);
  combined.set(x, 0);
  combined.set(y, x.length);
  return (await sha256Hex(combined)).slice(0, 32);
}

export async function createMfidDocument(input: {
  genesisOwner: MfidOwnerKeyInput;
  additionalOwners?: MfidOwnerKeyInput[];
}): Promise<{
  document: MfidDocumentV1;
  mfid: string;
  did: string;
  genesisOwnerMethodId: string;
  ownerMethodIds: string[];
}> {
  const owners = [input.genesisOwner, ...(input.additionalOwners || [])].map((owner) => normalizePublicP256Jwk(owner.publicKeyJwk));
  assertUniqueOwnerKeys(owners);
  const mfid = await deriveMfid({ publicKeyJwk: owners[0] as JsonWebKey });
  const did = `did:mfid:${mfid}`;
  const verificationMethod = owners.map((publicKeyJwk, index) => ({
    id: `${did}#owner-${index}`,
    type: "JsonWebKey2020" as const,
    controller: did,
    publicKeyJwk,
  }));
  const ownerMethodIds = verificationMethod.map((method) => method.id);
  const document: MfidDocumentV1 = {
    $schema: MFID_DOCUMENT_V1_SCHEMA_ID,
    "@context": [...MFID_CONTEXT_V1],
    id: did,
    verificationMethod,
    authentication: [...ownerMethodIds],
    capabilityInvocation: [...ownerMethodIds],
    assertionMethod: [...ownerMethodIds],
    version: 1,
  };
  assertValidation(validateMfidDocument(document));
  return {
    document,
    mfid,
    did,
    genesisOwnerMethodId: ownerMethodIds[0] as string,
    ownerMethodIds,
  };
}

export async function updateMfidDocument(input: {
  currentDocument: MfidDocumentV1;
  currentProofChain: MfidProofChainV1;
  nextOwners: MfidOwnerKeyInput[];
}): Promise<{
  document: MfidDocumentV1;
  addedOwnerMethodIds: string[];
  removedOwnerMethodIds: string[];
}> {
  assertValidation(validateMfidDocument(input.currentDocument));
  const head = getProofChainHead(input.currentProofChain);
  if (!head) throw new Error("current proof-chain entries required");
  const currentHash = await computeMfidDocumentHash(input.currentDocument);
  if (head.documentHash !== currentHash) throw new Error("current document does not match proof-chain head");
  if (canonicalJson(head.document) !== canonicalJson(input.currentDocument)) {
    throw new Error("current document does not match proof-chain head document");
  }

  const nextOwnerKeys = input.nextOwners.map((owner) => normalizePublicP256Jwk(owner.publicKeyJwk));
  if (nextOwnerKeys.length < 1) throw new Error("nextOwners must not be empty");
  assertUniqueOwnerKeys(nextOwnerKeys);

  const currentMethods = input.currentDocument.verificationMethod.map((method) => normalizeVerificationMethod(method));
  const currentByKey = new Map(currentMethods.map((method) => [ownerKeyId(method.publicKeyJwk), method]));
  const maxOwnerIndex = maxOwnerIndexFromProofChain(input.currentDocument.id, input.currentProofChain);
  let nextOwnerIndex = maxOwnerIndex + 1;
  const verificationMethod: MfidVerificationMethodV1[] = [];
  const addedOwnerMethodIds: string[] = [];
  for (const key of nextOwnerKeys) {
    const existing = currentByKey.get(ownerKeyId(key));
    if (existing) {
      verificationMethod.push(existing);
      continue;
    }
    const method: MfidVerificationMethodV1 = {
      id: `${input.currentDocument.id}#owner-${nextOwnerIndex}`,
      type: "JsonWebKey2020",
      controller: input.currentDocument.id,
      publicKeyJwk: key,
    };
    nextOwnerIndex += 1;
    verificationMethod.push(method);
    addedOwnerMethodIds.push(method.id);
  }
  const nextIds = new Set(verificationMethod.map((method) => method.id));
  const removedOwnerMethodIds = currentMethods.map((method) => method.id).filter((id) => !nextIds.has(id));
  const ownerMethodIds = verificationMethod.map((method) => method.id);
  const document: MfidDocumentV1 = {
    $schema: MFID_DOCUMENT_V1_SCHEMA_ID,
    "@context": [...MFID_CONTEXT_V1],
    id: input.currentDocument.id,
    verificationMethod,
    authentication: [...ownerMethodIds],
    capabilityInvocation: [...ownerMethodIds],
    assertionMethod: [...ownerMethodIds],
    version: input.currentDocument.version + 1,
  };
  assertValidation(validateMfidDocument(document));
  return { document, addedOwnerMethodIds, removedOwnerMethodIds };
}

export async function prepareMfidDocumentProof(document: MfidDocumentV1): Promise<{
  documentHash: string;
  proofPayload: MfidDocumentProofPayloadV1;
  challengeHash: string;
}> {
  assertValidation(validateMfidDocument(document));
  const proofPayload = await computeMfidDocumentProofPayload(document);
  return {
    documentHash: proofPayload.documentHash,
    proofPayload,
    challengeHash: await sha256Hex(canonicalJson(proofPayload)),
  };
}

export async function createMfidProofChain(input: {
  document: MfidDocumentV1;
  ownerProofs: [MfidOwnerProofV1, ...MfidOwnerProofV1[]];
  policy: {
    createOwnerProofs: MfidCreateOwnerProofPolicy;
  };
}): Promise<{
  proofChain: MfidProofChainV1;
  entry: MfidProofChainEntryV1;
  documentHash: string;
  chainHeadHash: string;
}> {
  if (!input.policy?.createOwnerProofs) throw new Error("createOwnerProofs policy required");
  if (input.document.version !== 1) throw new Error("genesis document version must be 1");
  assertValidation(validateCreateOwnerProofCoverage(input.document, input.ownerProofs, input.policy.createOwnerProofs));
  const entry = await buildProofChainEntry({ document: input.document, proofs: input.ownerProofs });
  const proofChain: MfidProofChainV1 = {
    $schema: MFID_PROOF_CHAIN_V1_SCHEMA_ID,
    did: input.document.id,
    entries: [entry],
    chainHeadHash: entry.chainHash,
  };
  return { proofChain, entry, documentHash: entry.documentHash, chainHeadHash: entry.chainHash };
}

export async function appendMfidProofChainEntry(input: {
  previousProofChain: MfidProofChainV1;
  document: MfidDocumentV1;
  ownerProofs: [MfidOwnerProofV1, ...MfidOwnerProofV1[]];
}): Promise<{
  proofChain: MfidProofChainV1;
  entry: MfidProofChainEntryV1;
  documentHash: string;
  chainHeadHash: string;
}> {
  const previousEntry = getProofChainHead(input.previousProofChain);
  if (!previousEntry) throw new Error("previous proof-chain entries required");
  if (input.previousProofChain.did !== input.document.id) throw new Error("previous proof-chain did mismatch");
  if (input.document.version !== previousEntry.version + 1) throw new Error("document version must increase by exactly 1");
  assertValidation(validateUpdateOwnerProofCoverage(previousEntry.document, input.document, input.ownerProofs));
  const entry = await buildProofChainEntry({
    previousEntry,
    document: input.document,
    proofs: input.ownerProofs,
  });
  const proofChain: MfidProofChainV1 = {
    $schema: MFID_PROOF_CHAIN_V1_SCHEMA_ID,
    did: input.document.id,
    entries: [...input.previousProofChain.entries, entry],
    chainHeadHash: entry.chainHash,
  };
  return { proofChain, entry, documentHash: entry.documentHash, chainHeadHash: entry.chainHash };
}

export async function verifyMfidProfile(
  input: { didDocument: MfidDocumentV1; proofChain: MfidProofChainV1 },
  options: VerifyMfidProfileOptions
): Promise<VerifyMfidProfileResult> {
  try {
    assertVerifyOptions(options);
    const shape = validateMfidDocument(input.didDocument);
    if (!shape.ok) return fail("INVALID_DOCUMENT", shape.error);
    const recordShape = validateMfidProofChainRecord(input.proofChain, input.didDocument.id);
    if (!recordShape.ok) return fail("INVALID_PROOF_CHAIN", recordShape.error);
    const verified = await verifyMfidProofChain(input.proofChain, options);
    if (!verified.ok) return fail("INVALID_PROOF_CHAIN", verified.error);
    const lastEntry = getProofChainHead(input.proofChain);
    if (!lastEntry) return fail("INVALID_PROOF_CHAIN", "entries required");
    if (lastEntry.document.version !== input.didDocument.version) {
      return fail("DOCUMENT_MISMATCH", "record head document version mismatch");
    }
    const documentHash = await computeMfidDocumentHash(input.didDocument);
    if (documentHash !== lastEntry.documentHash) return fail("DOCUMENT_MISMATCH", "record head documentHash mismatch");
    if (canonicalJson(lastEntry.document) !== canonicalJson(input.didDocument)) {
      return fail("DOCUMENT_MISMATCH", "record head document mismatch");
    }
    const mfid = parseMfid(input.didDocument.id);
    if (!mfid) return fail("INVALID_DOCUMENT", "invalid did id");
    return {
      ok: true,
      did: input.didDocument.id,
      mfid,
      currentDocument: input.didDocument,
      documentHash,
      chainHeadHash: input.proofChain.chainHeadHash,
      ownerMethods: getActiveOwnerMethods(input.didDocument),
    };
  } catch (err) {
    return fail("VERIFY_ERROR", err instanceof Error ? err.message : String(err));
  }
}

async function buildProofChainEntry(input: {
  previousEntry?: MfidProofChainEntryV1;
  document: MfidDocumentV1;
  proofs: MfidOwnerProofV1[];
}): Promise<MfidProofChainEntryV1> {
  assertValidation(validateMfidDocument(input.document));
  for (const proof of input.proofs) assertValidation(validateMfidOwnerProof(proof));
  const documentHash = await computeMfidDocumentHash(input.document);
  const challengeHash = await computeMfidDocumentChallengeHash(input.document);
  for (const proof of input.proofs) {
    if (proof.challengeHash.toLowerCase() !== challengeHash) {
      throw new Error("proof challengeHash mismatch");
    }
  }
  const entryCore: Omit<MfidProofChainEntryV1, "chainHash"> = {
    version: input.document.version,
    document: input.document,
    proofs: input.proofs,
    ...(input.previousEntry ? { prevDocumentHash: input.previousEntry.documentHash } : {}),
    documentHash,
    ...(input.previousEntry ? { prevChainHash: input.previousEntry.chainHash } : {}),
  };
  return { ...entryCore, chainHash: await computeMfidProofChainEntryHash(entryCore) };
}

async function verifyMfidProofChain(chain: MfidProofChainV1, options: VerifyMfidProfileOptions): Promise<ValidationResult> {
  let previousEntry: MfidProofChainEntryV1 | undefined;
  const history = initialMethodIdentityHistory();
  for (const entry of chain.entries) {
    const result = await verifyProofChainEntry({ entry, previousEntry, did: chain.did, options });
    if (!result.ok) return result;
    const methodIdentity = validateMethodIdentityTransition(history, previousEntry?.document, entry.document);
    if (!methodIdentity.ok) return methodIdentity;
    previousEntry = entry;
  }
  if (!previousEntry) return { ok: false, error: "entries required" };
  if (chain.chainHeadHash !== previousEntry.chainHash) return { ok: false, error: "chainHeadHash mismatch" };
  return { ok: true };
}

async function verifyProofChainEntry(input: {
  entry: MfidProofChainEntryV1;
  previousEntry?: MfidProofChainEntryV1;
  did: string;
  options: VerifyMfidProfileOptions;
}): Promise<ValidationResult> {
  const { entry, previousEntry } = input;
  const entryKeys = assertAllowedKeys(entry as unknown as Record<string, unknown>, [
    "version",
    "document",
    "proofs",
    "prevDocumentHash",
    "documentHash",
    "prevChainHash",
    "chainHash",
  ]);
  if (!entryKeys.ok) return entryKeys;
  if (!Number.isInteger(entry.version) || entry.version < 1) return { ok: false, error: "invalid entry.version" };
  if (entry.version !== (previousEntry?.version || 0) + 1) {
    return { ok: false, error: "entry version must increase by exactly 1" };
  }
  if (entry.document?.id !== input.did) return { ok: false, error: "entry document did mismatch" };
  if (entry.document?.version !== entry.version) return { ok: false, error: "entry document version mismatch" };
  const docShape = validateMfidDocument(entry.document);
  if (!docShape.ok) return { ok: false, error: `entry document invalid: ${docShape.error}` };
  if (!Array.isArray(entry.proofs) || entry.proofs.length < 1) return { ok: false, error: "entry proofs required" };
  for (const proof of entry.proofs) {
    const proofShape = validateMfidOwnerProof(proof);
    if (!proofShape.ok) return { ok: false, error: `entry proof invalid: ${proofShape.error}` };
  }
  if (entry.prevDocumentHash !== previousEntry?.documentHash) return { ok: false, error: "entry prevDocumentHash mismatch" };
  if (entry.prevChainHash !== previousEntry?.chainHash) return { ok: false, error: "entry prevChainHash mismatch" };
  const documentHash = await computeMfidDocumentHash(entry.document);
  if (entry.documentHash !== documentHash) return { ok: false, error: "entry documentHash mismatch" };
  const { chainHash: _chainHash, ...entryCore } = entry;
  const expectedChainHash = await computeMfidProofChainEntryHash(entryCore);
  if (entry.chainHash !== expectedChainHash) return { ok: false, error: "entry chainHash mismatch" };
  const coverage = previousEntry
    ? validateUpdateOwnerProofCoverage(previousEntry.document, entry.document, entry.proofs)
    : validateCreateOwnerProofCoverage(entry.document, entry.proofs, input.options.ownerProofPolicy.createOwnerProofs);
  if (!coverage.ok) return coverage;
  if (!previousEntry) {
    const firstOwner = findMethodById(entry.document, `${entry.document.id}#owner-0`);
    if (!firstOwner) return { ok: false, error: "genesis owner-0 missing" };
    if ((await deriveMfid({ publicKeyJwk: firstOwner.publicKeyJwk })) !== parseMfid(entry.document.id)) {
      return { ok: false, error: "did id does not bind to genesis owner public key" };
    }
  }
  for (const proof of entry.proofs) {
    const methods = [
      ...(previousEntry ? previousEntry.document.verificationMethod : []),
      ...entry.document.verificationMethod,
    ].filter((method, index, all) => all.findIndex((item) => item.id === method.id) === index);
    const method = methods.find((item) => item.id === proof.verificationMethod) || null;
    if (!method) return { ok: false, error: "entry proof verificationMethod not found" };
    const proofResult = await verifyMfidProofWithMethod(entry.document, proof, method, input.options);
    if (!proofResult.ok) return proofResult;
  }
  return { ok: true };
}

function validateCreateOwnerProofCoverage(
  document: MfidDocumentV1,
  proofs: MfidOwnerProofV1[],
  policy: MfidCreateOwnerProofPolicy
): ValidationResult {
  if (policy !== "first-owner-only" && policy !== "all-owners") return { ok: false, error: "invalid createOwnerProofs policy" };
  const expectedIds = policy === "all-owners" ? document.authentication : [`${document.id}#owner-0`];
  const proofIds = new Set(proofs.map((proof) => String(proof.verificationMethod || "")));
  for (const methodId of expectedIds) {
    if (!proofIds.has(methodId)) return { ok: false, error: "entry proofs do not satisfy create owner policy" };
  }
  for (const proof of proofs) {
    if (!document.authentication.includes(proof.verificationMethod)) {
      return { ok: false, error: "genesis proof must use active owner method" };
    }
  }
  return validateProofShapes(document, proofs);
}

function validateUpdateOwnerProofCoverage(
  previousDocument: MfidDocumentV1,
  nextDocument: MfidDocumentV1,
  proofs: MfidOwnerProofV1[]
): ValidationResult {
  if (previousDocument.id !== nextDocument.id) return { ok: false, error: "did mismatch" };
  if (nextDocument.version !== previousDocument.version + 1) return { ok: false, error: "document version must increase by exactly 1" };
  const previousOwnerIds = new Set(previousDocument.authentication);
  const nextOwnerIds = new Set(nextDocument.authentication);
  let coversPreviousOwner = false;
  let coversNextOwner = false;
  for (const proof of proofs) {
    if (previousOwnerIds.has(proof.verificationMethod)) coversPreviousOwner = true;
    if (nextOwnerIds.has(proof.verificationMethod)) coversNextOwner = true;
    if (!previousOwnerIds.has(proof.verificationMethod) && !nextOwnerIds.has(proof.verificationMethod)) {
      return { ok: false, error: "entry proof must use previous or next owner method" };
    }
  }
  if (!coversPreviousOwner) return { ok: false, error: "entry proofs must cover previous owner" };
  if (!coversNextOwner) return { ok: false, error: "entry proofs must cover next owner" };
  return validateProofShapes(nextDocument, proofs);
}

function validateProofShapes(document: MfidDocumentV1, proofs: MfidOwnerProofV1[]): ValidationResult {
  void document;
  for (const proof of proofs) {
    const proofShape = validateMfidOwnerProof(proof);
    if (!proofShape.ok) return proofShape;
  }
  return { ok: true };
}

async function verifyMfidProofWithMethod(
  document: MfidDocumentV1,
  proof: MfidOwnerProofV1,
  method: MfidVerificationMethodV1,
  options: VerifyMfidProfileOptions
): Promise<ValidationResult> {
  const expectedChallengeHash = (await computeMfidDocumentChallengeHash(document)).toLowerCase();
  if (proof.verificationMethod !== method.id) return { ok: false, error: "proof verificationMethod mismatch" };
  if (proof.challengeHash.toLowerCase() !== expectedChallengeHash) return { ok: false, error: "proof challengeHash mismatch" };
  if (proof.type === "jwk.sign") return verifyJwkOwnerProof(method.publicKeyJwk, proof.signature, expectedChallengeHash);
  return verifyWebauthnOwnerProof(method.publicKeyJwk, proof, expectedChallengeHash, options);
}

async function verifyJwkOwnerProof(publicJwk: JsonWebKey, signature: string, challengeHash: string): Promise<ValidationResult> {
  try {
    const key = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await verifyEcdsaSignature(key, b64urlToBytes(signature), new TextEncoder().encode(challengeHash));
    return ok ? { ok: true } : { ok: false, error: "proof signature verification failed" };
  } catch {
    return { ok: false, error: "proof signature verification failed" };
  }
}

async function verifyWebauthnOwnerProof(
  publicJwk: JsonWebKey,
  proof: MfidWebauthnOwnerProofV1,
  expectedChallengeHash: string,
  options: VerifyMfidProfileOptions
): Promise<ValidationResult> {
  const allowedRpIds = normalizeList(options.webauthn.allowedRpIds);
  const allowedOrigins = normalizeList(options.webauthn.allowedOrigins);
  if (!allowedRpIds.length) return { ok: false, error: "allowedRpIds is empty" };
  if (!allowedOrigins.length) return { ok: false, error: "allowedOrigins is empty" };
  let clientData: { type?: string; challenge?: string; origin?: string } = {};
  let clientDataBytes: Uint8Array;
  try {
    clientDataBytes = b64urlToBytes(proof.clientDataJSON);
    clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  } catch {
    return { ok: false, error: "invalid proof.clientDataJSON" };
  }
  if (clientData.type !== "webauthn.get") return { ok: false, error: "proof clientData.type must be webauthn.get" };
  if (!allowedOrigins.includes(String(clientData.origin || "").trim().toLowerCase())) {
    return { ok: false, error: "proof origin not allowed" };
  }
  let challengeFromClient: string;
  try {
    challengeFromClient = bytesToHex(b64urlToBytes(String(clientData.challenge || ""))).toLowerCase();
  } catch {
    return { ok: false, error: "invalid proof.clientData.challenge" };
  }
  if (challengeFromClient !== expectedChallengeHash) return { ok: false, error: "proof clientData.challenge mismatch" };
  let authData: Uint8Array;
  try {
    authData = b64urlToBytes(proof.authenticatorData);
  } catch {
    return { ok: false, error: "invalid proof.authenticatorData" };
  }
  if (authData.length < 37) return { ok: false, error: "invalid proof.authenticatorData" };
  const flags = authData[32] || 0;
  if ((flags & 0x01) !== 0x01) return { ok: false, error: "proof flags require user presence" };
  if ((flags & 0x04) !== 0x04) return { ok: false, error: "proof flags require user verification" };
  if ((flags & 0x80) === 0x80 && options.webauthn.allowAuthenticatorExtensions !== true) {
    return { ok: false, error: "proof authenticator extensions not allowed" };
  }
  const rpIdHash = authData.slice(0, 32);
  let rpMatched = false;
  for (const rpId of allowedRpIds) {
    if ((await sha256Hex(new TextEncoder().encode(rpId))) === bytesToHex(rpIdHash)) rpMatched = true;
  }
  if (!rpMatched) return { ok: false, error: "proof rpIdHash not allowed" };
  try {
    const key = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const clientDataHash = new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(clientDataBytes)));
    const signedData = concatBytes(authData, clientDataHash);
    const ok = await verifyEcdsaSignature(key, b64urlToBytes(proof.signature), signedData);
    return ok ? { ok: true } : { ok: false, error: "proof signature verification failed" };
  } catch {
    return { ok: false, error: "proof signature verification failed" };
  }
}

function validateMfidDocument(value: unknown): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "mfid document must be object" };
  const record = value as Record<string, unknown>;
  const keys = assertAllowedKeys(record, [
    "$schema",
    "@context",
    "id",
    "verificationMethod",
    "authentication",
    "capabilityInvocation",
    "assertionMethod",
    "version",
  ]);
  if (!keys.ok) return keys;
  const doc = value as MfidDocumentV1;
  if (doc.$schema !== MFID_DOCUMENT_V1_SCHEMA_ID) return { ok: false, error: "invalid $schema" };
  if (!parseMfid(String(doc.id || ""))) return { ok: false, error: "invalid did id" };
  if (!Array.isArray(doc["@context"]) || doc["@context"].length !== MFID_CONTEXT_V1.length) {
    return { ok: false, error: "invalid @context" };
  }
  for (let index = 0; index < MFID_CONTEXT_V1.length; index += 1) {
    if (doc["@context"][index] !== MFID_CONTEXT_V1[index]) return { ok: false, error: "invalid @context" };
  }
  if (!Number.isInteger(doc.version) || doc.version < 1) return { ok: false, error: "invalid version" };
  if (!Array.isArray(doc.verificationMethod) || doc.verificationMethod.length < 1) {
    return { ok: false, error: "verificationMethod must include owner method" };
  }
  const keyIds = new Set<string>();
  for (const method of doc.verificationMethod as Array<Record<string, unknown>>) {
    const methodKeys = assertAllowedKeys(method, ["id", "type", "controller", "publicKeyJwk"]);
    if (!methodKeys.ok) return methodKeys;
    const normalized = normalizeVerificationMethod(method as unknown as MfidVerificationMethodV1);
    if (normalized.controller !== doc.id) return { ok: false, error: "verificationMethod controller mismatch" };
    if (getOwnerIndex(doc.id, normalized.id) === null) return { ok: false, error: "verificationMethod id must use owner-<n>" };
    const keyId = ownerKeyId(normalized.publicKeyJwk);
    if (keyIds.has(keyId)) return { ok: false, error: "duplicate owner public key" };
    keyIds.add(keyId);
  }
  if (!sameStringArray(doc.authentication, doc.verificationMethod.map((method) => method.id))) {
    return { ok: false, error: "authentication must equal active owner methods" };
  }
  if (!sameStringArray(doc.capabilityInvocation, doc.verificationMethod.map((method) => method.id))) {
    return { ok: false, error: "capabilityInvocation must equal active owner methods" };
  }
  if (!sameStringArray(doc.assertionMethod, doc.verificationMethod.map((method) => method.id))) {
    return { ok: false, error: "assertionMethod must equal active owner methods" };
  }
  return { ok: true };
}

function validateMfidOwnerProof(value: unknown): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "missing owner proof" };
  const proof = value as MfidOwnerProofV1;
  if (proof.type !== "jwk.sign" && proof.type !== "webauthn.get") return { ok: false, error: "invalid proof.type" };
  const keys =
    proof.type === "jwk.sign"
      ? assertAllowedKeys(proof as unknown as Record<string, unknown>, ["type", "verificationMethod", "challengeHash", "alg", "signature"])
      : assertAllowedKeys(proof as unknown as Record<string, unknown>, [
          "type",
          "verificationMethod",
          "challengeHash",
          "clientDataJSON",
          "authenticatorData",
          "signature",
        ]);
  if (!keys.ok) return keys;
  if (!String(proof.verificationMethod || "").trim()) return { ok: false, error: "proof.verificationMethod required" };
  if (!isHex64(String(proof.challengeHash || "").toLowerCase())) return { ok: false, error: "invalid proof.challengeHash format" };
  if (!String(proof.signature || "").trim()) return { ok: false, error: "proof.signature required" };
  if (proof.type === "jwk.sign" && proof.alg !== "ES256") return { ok: false, error: "invalid proof.alg" };
  if (proof.type === "webauthn.get") {
    if (!String(proof.clientDataJSON || "").trim()) return { ok: false, error: "proof.clientDataJSON required" };
    if (!String(proof.authenticatorData || "").trim()) return { ok: false, error: "proof.authenticatorData required" };
  }
  return { ok: true };
}

function validateMfidProofChainRecord(value: unknown, did: string): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "mfid proof-chain must be object" };
  const keys = assertAllowedKeys(value as Record<string, unknown>, ["$schema", "did", "entries", "chainHeadHash"]);
  if (!keys.ok) return keys;
  const chain = value as MfidProofChainV1;
  if (chain.$schema !== MFID_PROOF_CHAIN_V1_SCHEMA_ID) return { ok: false, error: "invalid $schema" };
  if (chain.did !== did) return { ok: false, error: "record.did mismatch" };
  if (!Array.isArray(chain.entries) || chain.entries.length < 1) return { ok: false, error: "entries required" };
  if (!isHex64(String(chain.chainHeadHash || ""))) return { ok: false, error: "invalid chainHeadHash" };
  return { ok: true };
}

function assertVerifyOptions(options: VerifyMfidProfileOptions): void {
  if (!options?.ownerProofPolicy?.createOwnerProofs) throw new Error("ownerProofPolicy.createOwnerProofs required");
  if (options.ownerProofPolicy.createOwnerProofs !== "first-owner-only" && options.ownerProofPolicy.createOwnerProofs !== "all-owners") {
    throw new Error("invalid ownerProofPolicy.createOwnerProofs");
  }
  if (!options.webauthn || !Array.isArray(options.webauthn.allowedRpIds) || !Array.isArray(options.webauthn.allowedOrigins)) {
    throw new Error("webauthn allowedRpIds and allowedOrigins required");
  }
}

function validateMethodIdentityTransition(
  history: { activeIds: Set<string>; usedIds: Set<string> },
  previousDocument: Pick<MfidDocumentV1, "verificationMethod"> | undefined,
  nextDocument: Pick<MfidDocumentV1, "verificationMethod">
): ValidationResult {
  const currentMethodIds = new Set<string>();
  const previousMethods = new Map((previousDocument?.verificationMethod || []).map((method) => [method.id, normalizeVerificationMethod(method)]));
  for (const method of nextDocument.verificationMethod) {
    if (currentMethodIds.has(method.id)) return { ok: false, error: "duplicate verificationMethod id" };
    currentMethodIds.add(method.id);
    if (!history.activeIds.has(method.id) && history.usedIds.has(method.id)) {
      return { ok: false, error: "method id reused across proof chain history" };
    }
    const previousMethod = previousMethods.get(method.id);
    if (previousMethod && canonicalJson(previousMethod) !== canonicalJson(normalizeVerificationMethod(method))) {
      return { ok: false, error: "retained method changed" };
    }
    history.usedIds.add(method.id);
  }
  history.activeIds = currentMethodIds;
  return { ok: true };
}

function initialMethodIdentityHistory(): { activeIds: Set<string>; usedIds: Set<string> } {
  return { activeIds: new Set(), usedIds: new Set() };
}

function normalizePublicP256Jwk(value: JsonWebKey): JsonWebKey {
  const jwk = value as Record<string, unknown>;
  const valid = validatePublicP256Jwk(jwk);
  if (!valid.ok) throw new Error(valid.error);
  const out = {
    kty: jwk?.kty,
    crv: jwk?.crv,
    x: jwk?.x,
    y: jwk?.y,
  };
  return out as JsonWebKey;
}

function validatePublicP256Jwk(value: unknown): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "invalid publicKeyJwk" };
  const jwk = value as Record<string, unknown>;
  const keys = assertAllowedKeys(jwk, ["kty", "crv", "x", "y"]);
  if (!keys.ok) return { ok: false, error: `invalid publicKeyJwk: ${keys.error}` };
  if (jwk.kty !== "EC") return { ok: false, error: "invalid publicKeyJwk.kty" };
  if (jwk.crv !== "P-256") return { ok: false, error: "invalid publicKeyJwk.crv" };
  if (typeof jwk.x !== "string" || !jwk.x.trim() || jwk.x.includes("=")) return { ok: false, error: "invalid publicKeyJwk.x" };
  if (typeof jwk.y !== "string" || !jwk.y.trim() || jwk.y.includes("=")) return { ok: false, error: "invalid publicKeyJwk.y" };
  try {
    const x = b64urlToBytes(jwk.x);
    const y = b64urlToBytes(jwk.y);
    if (x.length !== 32 || y.length !== 32) {
      return { ok: false, error: "invalid publicKeyJwk coordinate length" };
    }
    if (!isValidP256Point(x, y)) return { ok: false, error: "invalid publicKeyJwk point" };
  } catch {
    return { ok: false, error: "invalid publicKeyJwk coordinate encoding" };
  }
  return { ok: true };
}

const P256_P = BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff");
const P256_A = P256_P - 3n;
const P256_B = BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b");

function isValidP256Point(xBytes: Uint8Array, yBytes: Uint8Array): boolean {
  const x = bytesToBigInt(xBytes);
  const y = bytesToBigInt(yBytes);
  if (x >= P256_P || y >= P256_P) return false;
  const left = mod(y * y, P256_P);
  const right = mod((x * x * x) + (P256_A * x) + P256_B, P256_P);
  return left === right;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let out = 0n;
  for (const byte of bytes) out = (out << 8n) + BigInt(byte);
  return out;
}

function mod(value: bigint, modulus: bigint): bigint {
  const result = value % modulus;
  return result >= 0n ? result : result + modulus;
}

function normalizeVerificationMethod(method: MfidVerificationMethodV1): MfidVerificationMethodV1 {
  if (method.type !== "JsonWebKey2020") throw new Error("invalid verificationMethod.type");
  return {
    id: String(method.id || "").trim(),
    type: "JsonWebKey2020",
    controller: String(method.controller || "").trim(),
    publicKeyJwk: normalizePublicP256Jwk(method.publicKeyJwk),
  };
}

function assertUniqueOwnerKeys(keys: JsonWebKey[]): void {
  const seen = new Set<string>();
  for (const key of keys) {
    const id = ownerKeyId(key);
    if (seen.has(id)) throw new Error("duplicate owner public key");
    seen.add(id);
  }
}

function ownerKeyId(jwk: JsonWebKey): string {
  const normalized = normalizePublicP256Jwk(jwk);
  return `${normalized.x}.${normalized.y}`;
}

function maxOwnerIndexFromProofChain(did: string, proofChain: MfidProofChainV1): number {
  let max = -1;
  for (const entry of proofChain.entries || []) {
    for (const method of entry.document?.verificationMethod || []) {
      const index = getOwnerIndex(did, method.id);
      if (index !== null && index > max) max = index;
    }
  }
  return max;
}

function getOwnerIndex(did: string, methodId: string): number | null {
  const prefix = `${did}#owner-`;
  if (!String(methodId || "").startsWith(prefix)) return null;
  const raw = methodId.slice(prefix.length);
  if (!/^(?:0|[1-9][0-9]*)$/.test(raw)) return null;
  return Number(raw);
}

function getProofChainHead(proofChain: MfidProofChainV1): MfidProofChainEntryV1 | null {
  return Array.isArray(proofChain.entries) ? proofChain.entries[proofChain.entries.length - 1] || null : null;
}

function getActiveOwnerMethods(doc: MfidDocumentV1): MfidVerificationMethodV1[] {
  return doc.authentication.map((methodId) => findMethodById(doc, methodId)).filter((method): method is MfidVerificationMethodV1 => !!method);
}

function findMethodById(doc: Pick<MfidDocumentV1, "verificationMethod">, methodId: string): MfidVerificationMethodV1 | null {
  return (doc.verificationMethod || []).find((method) => method.id === methodId) || null;
}

function fail(code: string, error: string): VerifyMfidProfileResult {
  return { ok: false, code, error };
}

function assertValidation(result: ValidationResult): void {
  if (!result.ok) throw new Error(result.error);
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: string[]): ValidationResult {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) return { ok: false, error: `unsupported field: ${key}` };
  }
  return { ok: true };
}

function sameStringArray(left: string[], right: string[]): boolean {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  const seen = new Set<string>();
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
    if (seen.has(left[index] as string)) return false;
    seen.add(left[index] as string);
  }
  return true;
}

function isHex64(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}

function normalizeList(values: string[]): string[] {
  return values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
}

function sortJsonStrict(value: unknown): unknown {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(sortJsonStrict);
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("canonicalJson cannot encode non-finite number");
    return value;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (child === undefined || typeof child === "function" || typeof child === "symbol" || typeof child === "bigint") {
        throw new Error("canonicalJson cannot encode non-JSON value");
      }
      out[key] = sortJsonStrict(child);
    }
    return out;
  }
  throw new Error("canonicalJson cannot encode non-JSON value");
}

function b64urlToBytes(b64url: string): Uint8Array {
  const safe = String(b64url || "").trim();
  if (!/^[A-Za-z0-9_-]*$/.test(safe)) throw new Error("invalid base64url");
  const pad = "=".repeat((4 - (safe.length % 4)) % 4);
  const binary = atob((safe + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

async function verifyEcdsaSignature(key: CryptoKey, signature: Uint8Array, data: Uint8Array): Promise<boolean> {
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(signature),
    toArrayBuffer(data)
  );
  if (ok) return true;
  const raw = derToRawEcdsa(signature, 32);
  return !!raw && await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(raw),
    toArrayBuffer(data)
  );
}

function derToRawEcdsa(signature: Uint8Array, size: number): Uint8Array | null {
  if (signature.length === size * 2) return signature;
  if (signature.length < 8 || signature[0] !== 0x30) return null;
  let offset = 2;
  if (signature[1] === 0x81) offset = 3;
  if (offset + 2 > signature.length || signature[offset] !== 0x02) return null;
  const rLength = signature[offset + 1] ?? -1;
  if (rLength < 1) return null;
  const rStart = offset + 2;
  const rEnd = rStart + rLength;
  if (rEnd + 2 > signature.length || signature[rEnd] !== 0x02) return null;
  const sLength = signature[rEnd + 1] ?? -1;
  if (sLength < 1) return null;
  const sStart = rEnd + 2;
  const sEnd = sStart + sLength;
  if (sEnd !== signature.length) return null;
  const r = normalizeDerInteger(signature.slice(rStart, rEnd), size);
  const s = normalizeDerInteger(signature.slice(sStart, sEnd), size);
  if (!r || !s) return null;
  const raw = new Uint8Array(size * 2);
  raw.set(r, 0);
  raw.set(s, size);
  return raw;
}

function normalizeDerInteger(value: Uint8Array, size: number): Uint8Array | null {
  let bytes = value;
  while (bytes.length > 0 && bytes[0] === 0x00) bytes = bytes.slice(1);
  if (bytes.length > size) return null;
  const out = new Uint8Array(size);
  out.set(bytes, size - bytes.length);
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
