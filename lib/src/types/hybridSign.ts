import type { SessionMetadata } from './session';
import type { SessionEndEvent } from './sessionEnd';

export type PdfSource = string;

export type TenantId = string;

export type Language = 'en' | 'de';

export interface HybridSignProps {
  tenantId: TenantId;
  language?: Language;
  transactionId: string;
  apiEndpoint?: string;
  secretKey?: string;
  signee?: string;
  showCloseButton?: boolean;
  sessionMetadataOverride?: Partial<SessionMetadata>;
  onSessionEnd?: (event: SessionEndEvent) => void;
}
