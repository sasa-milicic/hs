import { emitApiError, extractApiErrorCode } from './apiErrorBus';
import { resolveApiUrl } from './apiConfig';

export async function postJson<T>(
  path: string,
  body: unknown,
  apiToken?: string,
): Promise<T> {
  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { 'Api-Token': apiToken } : {}),
    },
    body: JSON.stringify(body),
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
