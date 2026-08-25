import type { StampInProgress } from '../pdf/stampRect';

export interface StampPdfParams {
  transactionId: string;
  stamp: StampInProgress;
  apiToken: string;
}
