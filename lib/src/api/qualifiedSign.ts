import { postJson } from '../http/postJson';
import type {
  ContinueQualSignParams,
  StartQualSignParams,
  StartQualSignResult,
} from './qualifiedSign.types';

const START_URL = 'sign/v1/startQualSign';
const CONTINUE_URL = 'sign/v1/continueQualSign';

const QUAL_SIGN_SESSION_ID_REGEX = /(jsessionid=)([a-zA-Z0-9]+)/;

interface StartQualSignResponse {
  transactionId: string;
  embeddedHtml: string;
}

export async function startQualSign({
  transactionId,
  roleId,
  roleLabel,
  signature,
  apiToken,
}: StartQualSignParams): Promise<StartQualSignResult> {
  const callbackUrl = encodeURIComponent(window.location.origin);
  const response = await postJson<StartQualSignResponse>(
    `${START_URL}?callbackUrl=${callbackUrl}`,
    {
      transactionId,
      roleId,
      roleLabel,
      platform: 'desktop',
      signatureData: { signature },
    },
    apiToken,
  );

  const sessionId = response.embeddedHtml.match(
    QUAL_SIGN_SESSION_ID_REGEX,
  )?.[2];
  if (!sessionId) {
    throw new Error(
      'startQualSign: could not extract jsessionid from embeddedHtml',
    );
  }

  return {
    transactionId: response.transactionId,
    sessionId,
    embeddedHtml: response.embeddedHtml,
  };
}

export async function continueQualSign({
  transactionId,
  roleId,
  roleLabel,
  signature,
  sessionId,
  apiToken,
}: ContinueQualSignParams): Promise<void> {
  await postJson<void>(
    `${CONTINUE_URL}/${sessionId}/${transactionId}`,
    {
      transactionId,
      roleId,
      roleLabel,
      signatureData: { signature },
    },
    apiToken,
  );
}
