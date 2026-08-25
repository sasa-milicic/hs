import { stampPdf } from '../../api/stampPdf';
import type { StampInProgress } from '../../pdf/stampRect';
import type { ISessionStamp } from '../../types/session';

export interface UseStampCreationParams {
  transactionId: string;
  apiToken: string | null;
  refetchDocument: () => Promise<void>;
  scrollToPage: (pageNumber: number) => void;
  activeStampId: string | null;
  setActiveStampId: (id: string | null) => void;
  stampCreation: StampInProgress | null;
  setStampCreation: (stamp: StampInProgress | null) => void;
  isAddStampDialogOpen: boolean;
  setIsAddStampDialogOpen: (open: boolean) => void;
  isConfirmingStampCreation: boolean;
  setIsConfirmingStampCreation: (value: boolean) => void;
}

export interface UseStampCreationResult {
  activateStamp: (stamp: ISessionStamp) => void;
  cancelStampCreation: () => void;
  confirmStampCreation: () => Promise<void>;
}

export function useStampCreation({
  transactionId,
  apiToken,
  refetchDocument,
  scrollToPage,
  setActiveStampId,
  stampCreation,
  setStampCreation,
  isConfirmingStampCreation,
  setIsConfirmingStampCreation,
}: UseStampCreationParams): UseStampCreationResult {
  function activateStamp(stamp: ISessionStamp) {
    setActiveStampId(stamp.stampId);
    scrollToPage(stamp.page);
  }

  function cancelStampCreation() {
    setStampCreation(null);
  }

  async function confirmStampCreation() {
    if (!stampCreation || !apiToken || isConfirmingStampCreation) return;
    setIsConfirmingStampCreation(true);
    try {
      await stampPdf({ transactionId, stamp: stampCreation, apiToken });
      setStampCreation(null);
      await refetchDocument();
    } catch {
    } finally {
      setIsConfirmingStampCreation(false);
    }
  }

  return {
    activateStamp,
    cancelStampCreation,
    confirmStampCreation,
  };
}
