import type { ISessionSignature } from '../types/session';

export interface StartQualSignParams {
  transactionId: string;
  roleId: string;
  roleLabel: string;
  signature: ISessionSignature;
  apiToken: string;
}

export interface StartQualSignResult {
  transactionId: string;
  sessionId: string;
  embeddedHtml: string;
}

export interface ContinueQualSignParams {
  transactionId: string;
  roleId: string;
  roleLabel: string;
  signature: ISessionSignature;
  sessionId: string;
  apiToken: string;
}
