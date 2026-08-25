import type { ISessionSignature } from '../types/session';

export interface StampSignParams {
  transactionId: string;
  roleId: string;
  stampTemplateName: string;
  signature: ISessionSignature;
  apiToken: string;
}
