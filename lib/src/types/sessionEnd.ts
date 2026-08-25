export type SessionEndReason =
  'Canceled' | 'Finalized' | 'RemoteSignatureProcessing' | 'SignatureWorkflow';

export interface SessionEndEvent {
  reason: SessionEndReason;
  transactionId: string;
  tenantId: string;
  locale: string;
  isTemporarySave?: boolean;
  deliveryChannel?: string;
}
