import tenantConfig from '../src/config/tenant.config.json';

// Same env-driven base as `apiConfig.ts` in `lib/` (`VITE_API_ENDPOINT`,
// falling back to the local-dev default) — these calls happen before
// `<HybridSign>` mounts, so they can't go through the library's own config.
// Preserves the existing double-slash-after-base quirk (`/websign/v1/...`
// itself has a leading slash, unlike every resource path in `lib/src/api/`).
const API_ENDPOINT =
  import.meta.env.VITE_API_ENDPOINT || '/hybridsign/backend_t/';
const INIT_URL = `${API_ENDPOINT}/websign/v1/init`;
const BULK_INIT_URL = `${API_ENDPOINT}/websign/v1/bulkInit`;

// What `<HybridSign>` needs to open a session — `secretKey` comes from both
// single init and bulkInit (standalone puts it on the session URL as `sk`).
export interface SessionDocument {
  transactionId: string;
  secretKey?: string;
}

export interface Meta {
  signActions: string[];
  defaultVSS: boolean;
  showSignatureDialog: boolean;
  finalizeU: boolean;
  deliveryCategory: string;
  allowAdditionalSignatures: boolean;
  allowAdditionalStamps: boolean;
  locale: string;
  allowInvitation: boolean;
  remoteSignatureValidityPeriod: string;
  remoteSignatureValidityUntil: string;
  consentText: string;
  mailBody: string;
  email: string;
  phone: string;
  username: string;
  signerName: string;
  signatureFlowEnabled: boolean; //form
  signatureFlowMail: string; //form
  signatureFlowNote: string; //form
}

export interface MetaStamp {
  departmentName: string;
  stampTemplateInputs: {
    docindex_$DOCDATE: string;
    docindex_Geschäftszahl: string;
    user_compartmentName: string;
    user_compartment: string;
    user_prename: string;
    user_secname: string;
  };
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildMeta(
  signatureFlowEnabled: boolean,
  signatureFlowMail: string,
  signatureFlowNote: string,
): Meta {
  return {
    ...tenantConfig.meta,
    signatureFlowEnabled,
    signatureFlowMail,
    signatureFlowNote,
  } as Meta;
}

async function initSingle(file: File, meta: Meta): Promise<SessionDocument> {
  const requestBody = {
    name: file.name,
    pdf: await fileToBase64(file),
    transactionId: Date.now().toString(),
    meta,
    metaStamp: tenantConfig.metaStamp,
  };

  const response = await fetch(INIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Token': 'userToken', // hardcoded
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Init failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    transactionId: string;
    webSignUrl: string;
    secretKey?: string;
  };
  // Standalone's `_handleSingleSessionResponse` also keeps `res.secretKey`
  // and later puts it on the session URL as `sk`.
  return { transactionId: data.transactionId, secretKey: data.secretKey };
}

async function initBulk(files: File[], meta: Meta): Promise<SessionDocument[]> {
  const batchPdfs = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      pdf: await fileToBase64(file),
    })),
  );
  const requestBody = {
    batchPdfs,
    sessionDTO: {
      transactionId: Date.now().toString(),
      meta,
      metaStamp: tenantConfig.metaStamp,
      name: '',
      pdf: '',
    },
  };

  const response = await fetch(BULK_INIT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Token': 'userToken', // hardcoded
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(
      `Bulk init failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Array<{
    transactionId: string;
    secretKey: string;
  }>;
  return data.map((entry) => ({
    transactionId: entry.transactionId,
    secretKey: entry.secretKey,
  }));
}

// Mirrors `_demo_app_reference`'s `sessionService.createSession` — picks
// single vs. bulk init based on file count, so callers always get back a
// document queue instead of branching on `files.length` themselves.
export async function createSession(
  files: File[],
  signatureFlowEnabled: boolean,
  signatureFlowMail: string,
  signatureFlowNote: string,
): Promise<SessionDocument[]> {
  const meta = buildMeta(
    signatureFlowEnabled,
    signatureFlowMail,
    signatureFlowNote,
  );
  if (files.length > 1) {
    return initBulk(files, meta);
  }
  return [await initSingle(files[0], meta)];
}
