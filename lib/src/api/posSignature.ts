import { postJson } from '../http/postJson';
import { resolveApiUrl } from '../http/apiConfig';
import type {
  CheckPosBindResult,
  StartPosSignatureParams,
} from './posSignature.types';

const CHECK_BIND_URL = 'pos/checkBind';
const START_URL = 'pos/posSign';

export async function checkPosBind(
  transactionId: string,
  apiToken: string,
): Promise<CheckPosBindResult | null> {
  const response = await fetch(
    `${resolveApiUrl(CHECK_BIND_URL)}/${transactionId}`,
    {
      headers: apiToken ? { 'Api-Token': apiToken } : undefined,
    },
  );
  if (!response.ok) return null;
  try {
    const result = (await response.json()) as CheckPosBindResult | null;
    return result?.posSessionId ? result : null;
  } catch {
    return null;
  }
}

export async function startPosSignature({
  posMinisignUrl,
  posUsername,
  uuid,
  apiToken,
}: StartPosSignatureParams): Promise<void> {
  await postJson<void>(
    START_URL,
    { posMinisignUrl, posUsername, uuid },
    apiToken,
  );
}
