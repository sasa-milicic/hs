type ApiErrorListener = (code: string) => void;

const listeners = new Set<ApiErrorListener>();

export function subscribeApiError(listener: ApiErrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitApiError(code: string): void {
  listeners.forEach((listener) => listener(code));
}

const GENERAL_ERROR_CODE = '9000';

export async function extractApiErrorCode(response: Response): Promise<string> {
  try {
    const body = await response.clone().json();
    if (body && typeof body.errorCode === 'string') return body.errorCode;
  } catch {}
  return GENERAL_ERROR_CODE;
}
