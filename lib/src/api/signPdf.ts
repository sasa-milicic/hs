import { postJson } from '../http/postJson';
import type {
  SignTouchSignBulkParams,
  SignTouchSignParams,
} from './signPdf.types';

const SIGN_PDF_URL = 'sign/v1/signPdf';
const SIGN_PDF_BULK_URL = 'sign/v1/signPdfBulk';

export async function signTouchSign({
  transactionId,
  roleId,
  roleLabel,
  signature,
  signatureImg,
  strokes,
  apiToken,
}: SignTouchSignParams): Promise<void> {
  await postJson<void>(
    SIGN_PDF_URL,
    {
      transactionId,
      roleId,
      roleLabel,
      platform: 'desktop',
      signatureData: {
        signature,
        signatureImg,
        signatureData: strokes,
      },
    },
    apiToken,
  );
}

export async function signTouchSignBulk({
  documents,
  signatureImg,
  strokes,
  apiToken,
}: SignTouchSignBulkParams): Promise<void> {
  await postJson<void>(
    SIGN_PDF_BULK_URL,
    documents.map(({ transactionId, targets }) => ({
      transactionId,
      signatureRoleDataList: targets.map(
        ({ roleId, roleLabel, signature }) => ({
          roleId,
          roleLabel,
          platform: 'desktop',
          signatureData: {
            signature,
            signatureImg,
            signatureData: strokes,
          },
        }),
      ),
    })),
    apiToken,
  );
}
