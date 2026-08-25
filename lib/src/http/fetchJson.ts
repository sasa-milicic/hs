import { emitApiError, extractApiErrorCode } from './apiErrorBus';
import { resolveApiUrl } from './apiConfig';

export async function fetchJson<T>(
  path: string,
  apiToken?: string,
): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    headers: apiToken ? { 'Api-Token': apiToken } : undefined,
  });

  if (!response.ok) {
    emitApiError(await extractApiErrorCode(response));
    throw new Error(
      `Request to ${url} failed: ${response.status} ${response.statusText}`,
    );
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
