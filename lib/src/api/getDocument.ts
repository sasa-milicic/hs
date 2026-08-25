import { fetchJson } from '../http/fetchJson';
import type {
  FetchDocumentParams,
  GetDocumentResponse,
} from './getDocument.types';

const GET_DOCUMENT_BASE_URL = 'document/v1/getDocument';

const FORCE_ORIGINAL = false;

export async function fetchDocument({
  transactionId,
  locale,
  signee,
  secretKey,
  apiToken,
}: FetchDocumentParams): Promise<GetDocumentResponse> {
  const path = [
    GET_DOCUMENT_BASE_URL,
    encodeURIComponent(transactionId),
    String(FORCE_ORIGINAL),
    encodeURIComponent(locale),
    signee ? encodeURIComponent(signee) : '',
  ].join('/');

  const query = secretKey ? `?secretKey=${encodeURIComponent(secretKey)}` : '';

  return fetchJson<GetDocumentResponse>(`${path}${query}`, apiToken);
}
