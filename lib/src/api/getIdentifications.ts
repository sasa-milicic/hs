import { fetchJson } from '../http/fetchJson';
import type { GetIdentificationsResponse } from './getIdentifications.types';

const GET_IDENTIFICATIONS_URL = 'sign/v1/getIdentifications';

export async function fetchRemoteSignatureIdTypes(
  apiToken?: string,
): Promise<string[]> {
  const response = await fetchJson<GetIdentificationsResponse>(
    GET_IDENTIFICATIONS_URL,
    apiToken,
  );
  return (response ?? []).map((entry) => entry.idType);
}
