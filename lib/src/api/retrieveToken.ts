import { fetchText } from '../http/fetchText';

const RETRIEVE_TOKEN_BASE_URL = 'token/v1/retrieveToken';

const tokenCache = new Map<string, string>();

async function fetchRetrieveToken(
  transactionId: string,
  tenantId: string,
): Promise<string> {
  const path = [
    RETRIEVE_TOKEN_BASE_URL,
    encodeURIComponent(transactionId),
    encodeURIComponent(tenantId),
  ].join('/');

  return fetchText(path);
}

export async function getTenantToken(
  transactionId: string,
  tenantId: string,
): Promise<string> {
  const cacheKey = `${transactionId}:${tenantId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const token = await fetchRetrieveToken(transactionId, tenantId);
  tokenCache.set(cacheKey, token);
  return token;
}
