import { postJson } from '../http/postJson';
import type { StampSignParams } from './stampSign.types';

const STAMP_SIGN_URL = 'sign/v1/stampSignPdf';

export async function signStampSign({
  transactionId,
  roleId,
  stampTemplateName,
  signature,
  apiToken,
}: StampSignParams): Promise<void> {
  await postJson<void>(
    STAMP_SIGN_URL,
    {
      transactionId,
      roleId,
      stampTemplateName,
      signatureData: { signature },
    },
    apiToken,
  );
}
