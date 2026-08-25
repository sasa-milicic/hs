import { emitApiError, extractApiErrorCode } from './apiErrorBus';
import { resolveApiUrl } from './apiConfig';

export async function fetchText(path: string): Promise<string> {
  const url = resolveApiUrl(path);
  const response = await fetch(url);

  if (!response.ok) {
    emitApiError(await extractApiErrorCode(response));
    throw new Error(
      `Request to ${url} failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}
