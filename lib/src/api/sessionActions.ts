import { fetchJson } from '../http/fetchJson';
import { postJson } from '../http/postJson';
import type {
  CancelSessionParams,
  RotateDocumentParams,
  SaveSessionBulkParams,
  SaveSessionParams,
  StartNewFlowParams,
} from './sessionActions.types';
import type { ISessionRole } from '../types/session';

const CANCEL_SESSION_BASE_URL = 'sign/v1/cancelSignatureProcess';
const SAVE_SESSION_URL = 'sign/v1/saveDocument';
const SAVE_SESSION_BULK_URL = 'sign/v1/bulkSaveDocument';
const ROTATE_DOCUMENT_BASE_URL = 'document/v1/rotateDocument';
const START_NEW_FLOW_BASE_URL = 'websign/v1/startNewFlow';

export async function cancelSession({
  transactionId,
  apiToken,
}: CancelSessionParams): Promise<void> {
  await fetchJson<void>(
    `${CANCEL_SESSION_BASE_URL}/${encodeURIComponent(transactionId)}`,
    apiToken,
  );
}

export async function rotateDocument({
  transactionId,
  deltaRotation,
  apiToken,
}: RotateDocumentParams): Promise<void> {
  await fetchJson<void>(
    `${ROTATE_DOCUMENT_BASE_URL}/${encodeURIComponent(transactionId)}/${deltaRotation}`,
    apiToken,
  );
}

function buildSignatureDataRoles(roles: ISessionRole[]) {
  return roles
    .map((role) => {
      const newSignatures = role.signatures.filter(
        (signature) =>
          signature.isCreatedInCurrentSession && !signature.transacted,
      );
      if (newSignatures.length === 0) return null;
      return {
        roleId: role.roleId,
        label: role.label,
        transacted: newSignatures.every((signature) => signature.transacted),
        signatures: newSignatures.map((signature) => ({
          page: signature.page,
          width: signature.width,
          height: signature.height,
          x: signature.x,
          y: signature.y,
          pageHeight: signature.pageHeight,
          pageWidth: signature.pageWidth,
          signatureId: signature.signatureId,
          mandatory: signature.mandatory,
          transacted: signature.transacted,
          text: signature.text,
          signActions: signature.signActions,
          email: signature.email,
          phone: signature.phone,
          firstName: signature.firstName,
          lastName: signature.lastName,
          dateOfBirth: signature.dateOfBirth,
          street: signature.street,
          doorNr: signature.doorNr,
          postalCode: signature.postalCode,
          city: signature.city,
          country: signature.country,
          idType: signature.idType,
          idValue: signature.idValue,
        })),
      };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null);
}

export async function saveSession({
  transactionId,
  temporarySave,
  roles,
  secretKey,
  apiToken,
}: SaveSessionParams): Promise<void> {
  const query = secretKey ? `?secretKey=${encodeURIComponent(secretKey)}` : '';
  await postJson<void>(
    `${SAVE_SESSION_URL}${query}`,
    {
      transactionId,
      temporarySave,
      signatureData: { roles: buildSignatureDataRoles(roles), checkboxes: [] },
      secretKey,
    },
    apiToken,
  );
}

export async function saveSessionBulk({
  documents,
  temporarySave,
  apiToken,
}: SaveSessionBulkParams): Promise<void> {
  await postJson<void>(
    SAVE_SESSION_BULK_URL,
    {
      saveDocuments: documents.map(({ transactionId, secretKey, roles }) => ({
        transactionId,
        secretKey,
        temporarySave,
        signatureData: { roles: buildSignatureDataRoles(roles) },
      })),
    },
    apiToken,
  );
}

export async function startNewFlow({
  transactionId,
  secretKey,
  apiToken,
}: StartNewFlowParams): Promise<void> {
  const query = secretKey ? `?secretKey=${encodeURIComponent(secretKey)}` : '';
  await fetchJson<void>(
    `${START_NEW_FLOW_BASE_URL}/${encodeURIComponent(transactionId)}${query}`,
    apiToken,
  );
}
