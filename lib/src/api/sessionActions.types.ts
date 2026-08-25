import type { ISessionRole } from '../types/session';

export interface CancelSessionParams {
  transactionId: string;
  apiToken: string;
}

export interface SaveSessionParams {
  transactionId: string;
  temporarySave: boolean;
  roles: ISessionRole[];
  secretKey?: string;
  apiToken: string;
}

export interface SaveSessionBulkDocument {
  transactionId: string;
  secretKey: string;
  roles: ISessionRole[];
}

export interface SaveSessionBulkParams {
  documents: SaveSessionBulkDocument[];
  temporarySave: boolean;
  apiToken: string;
}

export interface RotateDocumentParams {
  transactionId: string;
  deltaRotation: number;
  apiToken: string;
}

export interface StartNewFlowParams {
  transactionId: string;
  secretKey?: string;
  apiToken: string;
}
