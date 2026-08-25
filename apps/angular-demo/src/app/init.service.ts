import { Injectable } from '@angular/core';
import tenantConfig from '../config/tenant.config.json';
import { environment } from '../environments/environment';

// Same env-driven base as `apiConfig.ts` in `lib/` — these calls happen
// before HybridSign mounts, so they can't go through the library's own
// config. Preserves the existing double-slash-after-base quirk
// (`/websign/v1/...` itself has a leading slash).
export const API_ENDPOINT = environment.apiEndpoint || '/hybridsign/backend_t/';
const INIT_URL = `${API_ENDPOINT}/websign/v1/init`;
const BULK_INIT_URL = `${API_ENDPOINT}/websign/v1/bulkInit`;

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
  signatureFlowEnabled: boolean;
  signatureFlowMail: string;
  signatureFlowNote: string;
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
      'Api-Token': 'userToken',
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
      'Api-Token': 'userToken',
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

@Injectable({ providedIn: 'root' })
export class InitService {
  createSession(
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
    return initSingle(files[0], meta).then((document) => [document]);
  }
}
