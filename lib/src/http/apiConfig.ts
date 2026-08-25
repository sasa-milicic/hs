const DEFAULT_API_ENDPOINT = '/hybridsign/backend_t/';

let apiEndpoint = DEFAULT_API_ENDPOINT;

export function setApiEndpoint(endpoint: string): void {
  apiEndpoint = endpoint;
}

export function resolveApiUrl(path: string): string {
  return `${apiEndpoint}${path}`;
}
