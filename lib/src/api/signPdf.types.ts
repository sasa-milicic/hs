import type { ISessionSignature } from '../types/session';
import type { TouchpadStrokesModel } from '../pdf/touchpadSign';

export interface SignTouchSignParams {
  transactionId: string;
  roleId: string;
  roleLabel: string;
  signature: ISessionSignature;
  signatureImg: string;
  strokes: TouchpadStrokesModel;
  apiToken: string;
}

export interface BulkSignatureTarget {
  roleId: string;
  roleLabel: string;
  signature: ISessionSignature;
}

export interface BulkSignatureDocument {
  transactionId: string;
  targets: BulkSignatureTarget[];
}

export interface SignTouchSignBulkParams {
  documents: BulkSignatureDocument[];
  signatureImg: string;
  strokes: TouchpadStrokesModel;
  apiToken: string;
}
