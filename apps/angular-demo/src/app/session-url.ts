import type { Language, TenantId } from '@hs/lib';

// Mirrors `_standalone`'s session-create → session-sign navigation:
// `/session?transactionId=...&sk=...&name=...`. tenantId/language/signee are
// extra query params this demo needs (standalone takes tenant from env;
// invitation links from the legacy demo also carry `signee`).
export const SESSION_PATH = '/session';

export interface SessionUrlState {
  transactionId: string;
  secretKey?: string;
  name?: string;
  tenantId: TenantId;
  language: Language;
  signee?: string;
}

const LANGUAGES: Language[] = ['en', 'de'];

export function parseSessionUrl(url: URL): SessionUrlState | null {
  if (url.pathname !== SESSION_PATH) return null;
  const transactionId = url.searchParams.get('transactionId');
  if (!transactionId) return null;
  const languageParam = url.searchParams.get('language');
  return {
    transactionId,
    secretKey: url.searchParams.get('sk') || undefined,
    name: url.searchParams.get('name') || undefined,
    tenantId: url.searchParams.get('tenantId') || '1',
    language: LANGUAGES.includes(languageParam as Language)
      ? (languageParam as Language)
      : 'en',
    signee: url.searchParams.get('signee') || undefined,
  };
}

export function buildSessionPath(session: SessionUrlState): string {
  const params = new URLSearchParams();
  params.set('transactionId', session.transactionId);
  if (session.secretKey) params.set('sk', session.secretKey);
  if (session.name) params.set('name', session.name);
  params.set('tenantId', session.tenantId);
  params.set('language', session.language);
  if (session.signee) params.set('signee', session.signee);
  return `${SESSION_PATH}?${params.toString()}`;
}

export function readSessionFromLocation(): SessionUrlState | null {
  return parseSessionUrl(new URL(window.location.href));
}
