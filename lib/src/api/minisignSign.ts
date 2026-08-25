import { postJson } from '../http/postJson';
import type {
  MinisignBulkSession,
  MinisignSession,
  StartMinisignBulkParams,
  StartMinisignBulkResult,
  StartMinisignParams,
  StartMinisignResult,
} from './minisignSign.types';

const START_URL = 'sign/v1/startMinisign';
const POLL_URL = 'sign/v1/pollMinisign';
const CANCEL_URL = 'sign/v1/cancelMinisign';
const START_BULK_URL = 'sign/v1/startBulkMinisign';
const POLL_BULK_URL = 'sign/v1/pollBulkMinisign';

interface MinisignApiResponse {
  minisignTimeout: number;
  verification: {
    uuid: string;
    minisignurl: string;
    img?: string;
  };
}

function buildRequestBody(
  session: Pick<
    MinisignSession,
    'transactionId' | 'roleId' | 'roleLabel' | 'signature' | 'channels'
  > & {
    minisignurl?: string;
    uuid?: string;
  },
) {
  const types: { type: string; value: boolean | string; usetan: boolean }[] = [
    { type: 'noauth', value: false, usetan: false },
  ];
  if (session.channels.email)
    types.push({ type: 'email', value: session.channels.email, usetan: false });
  if (session.channels.phone)
    types.push({ type: 'sms', value: session.channels.phone, usetan: false });

  return {
    transactionId: session.transactionId,
    roleId: session.roleId,
    roleLabel: session.roleLabel,
    signatureData: {
      signature: session.signature,
      verification: {
        minisignaction: 'verify',
        minisignurl: session.minisignurl,
        uuid: session.uuid,
        types,
      },
    },
  };
}

export async function startMinisign({
  transactionId,
  roleId,
  roleLabel,
  signature,
  channels,
  apiToken,
}: StartMinisignParams): Promise<StartMinisignResult> {
  const response = await postJson<MinisignApiResponse>(
    START_URL,
    buildRequestBody({ transactionId, roleId, roleLabel, signature, channels }),
    apiToken,
  );

  return {
    session: {
      transactionId,
      roleId,
      roleLabel,
      signature,
      channels,
      minisignurl: response.verification.minisignurl,
      uuid: response.verification.uuid,
    },
    minisignTimeout: response.minisignTimeout,
  };
}

export async function pollMinisign(
  session: MinisignSession,
  apiToken: string,
): Promise<boolean> {
  const response = await postJson<MinisignApiResponse>(
    POLL_URL,
    buildRequestBody(session),
    apiToken,
  );
  return !!response.verification.img;
}

export async function cancelMinisign(
  session: MinisignSession,
  isExpired: boolean,
  apiToken: string,
): Promise<void> {
  await postJson<void>(
    `${CANCEL_URL}/${isExpired}`,
    buildRequestBody(session),
    apiToken,
  );
}

function buildBulkRequestBody(
  session: Pick<MinisignBulkSession, 'documents' | 'channels'> & {
    minisignurl?: string;
    uuid?: string;
  },
) {
  const types: { type: string; value: boolean | string; usetan: boolean }[] = [
    { type: 'noauth', value: false, usetan: false },
  ];
  if (session.channels.email)
    types.push({ type: 'email', value: session.channels.email, usetan: false });
  if (session.channels.phone)
    types.push({ type: 'sms', value: session.channels.phone, usetan: false });

  return session.documents.map(({ transactionId, targets }) => ({
    transactionId,
    signatureRoleDataList: targets.map(({ roleId, roleLabel, signature }) => ({
      roleId,
      roleLabel,
      signatureData: {
        signature,
        verification: {
          minisignaction: 'verify',
          minisignurl: session.minisignurl,
          uuid: session.uuid,
          types,
        },
      },
    })),
  }));
}

export async function startMinisignBulk({
  documents,
  channels,
  apiToken,
}: StartMinisignBulkParams): Promise<StartMinisignBulkResult> {
  const response = await postJson<MinisignApiResponse>(
    START_BULK_URL,
    buildBulkRequestBody({ documents, channels }),
    apiToken,
  );

  return {
    session: {
      documents,
      channels,
      minisignurl: response.verification.minisignurl,
      uuid: response.verification.uuid,
    },
    minisignTimeout: response.minisignTimeout,
  };
}

export async function pollMinisignBulk(
  session: MinisignBulkSession,
  apiToken: string,
): Promise<boolean> {
  const response = await postJson<MinisignApiResponse>(
    POLL_BULK_URL,
    buildBulkRequestBody(session),
    apiToken,
  );
  return !!response.verification.img;
}
