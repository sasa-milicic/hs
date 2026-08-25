import type { ISessionSignature } from '../types/session';

export interface MinisignChannels {
  email?: string;
  phone?: string;
}

export interface StartMinisignParams {
  transactionId: string;
  roleId: string;
  roleLabel: string;
  signature: ISessionSignature;
  channels: MinisignChannels;
  apiToken: string;
}

export interface MinisignSession {
  transactionId: string;
  roleId: string;
  roleLabel: string;
  signature: ISessionSignature;
  channels: MinisignChannels;
  minisignurl: string;
  uuid: string;
}

export interface StartMinisignResult {
  session: MinisignSession;
  minisignTimeout: number;
}

export interface BulkMinisignTarget {
  roleId: string;
  roleLabel: string;
  signature: ISessionSignature;
}

export interface BulkMinisignDocument {
  transactionId: string;
  targets: BulkMinisignTarget[];
}

export interface StartMinisignBulkParams {
  documents: BulkMinisignDocument[];
  channels: MinisignChannels;
  apiToken: string;
}

export interface MinisignBulkSession {
  documents: BulkMinisignDocument[];
  channels: MinisignChannels;
  minisignurl: string;
  uuid: string;
}

export interface StartMinisignBulkResult {
  session: MinisignBulkSession;
  minisignTimeout: number;
}
