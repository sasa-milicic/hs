import type { Dispatch, SetStateAction } from 'react';
import { updateCheckbox } from '../../api/updateCheckbox';
import { toCheckmarkApiY } from '../../pdf/checkmarkRect';
import type { CheckmarkInProgress } from '../../pdf/checkmarkRect';
import type { ISessionCheckmark } from '../../types/session';

export interface UseCheckmarkCreationParams {
  transactionId: string;
  apiToken: string | null;
  refetchDocument: () => Promise<void>;
  scrollToPage: (pageNumber: number) => void;
  checkmarks: ISessionCheckmark[];
  setCheckmarks: (
    updater: (previous: ISessionCheckmark[]) => ISessionCheckmark[],
  ) => void;
  checkmarkCreation: CheckmarkInProgress | null;
  setCheckmarkCreation: (checkmark: CheckmarkInProgress | null) => void;
  setActiveCheckmarkId: Dispatch<SetStateAction<string | null>>;
}

export interface UseCheckmarkCreationResult {
  activateCheckmark: (checkmark: ISessionCheckmark) => void;
  cancelCheckmarkCreation: () => void;
  confirmCheckmarkCreation: () => void;
  saveCheckmark: (
    checkmark: ISessionCheckmark,
    checked: boolean,
  ) => Promise<void>;
  deleteCheckmark: (checkmark: ISessionCheckmark) => void;
}

export function useCheckmarkCreation({
  transactionId,
  apiToken,
  refetchDocument,
  scrollToPage,
  setCheckmarks,
  checkmarkCreation,
  setCheckmarkCreation,
  setActiveCheckmarkId,
}: UseCheckmarkCreationParams): UseCheckmarkCreationResult {
  function activateCheckmark(checkmark: ISessionCheckmark) {
    setActiveCheckmarkId(checkmark.checkboxId);
    scrollToPage(checkmark.page);
  }

  function cancelCheckmarkCreation() {
    setCheckmarkCreation(null);
  }

  function confirmCheckmarkCreation() {
    if (!checkmarkCreation) return;
    const newCheckmark: ISessionCheckmark = {
      checkboxId: checkmarkCreation.id,
      name: checkmarkCreation.name,
      label: checkmarkCreation.label,
      page: checkmarkCreation.page,
      x: checkmarkCreation.x,
      y: toCheckmarkApiY(checkmarkCreation),
      width: checkmarkCreation.width,
      height: checkmarkCreation.height,
      checked: false,
      isCreatedInCurrentSession: true,
    };
    setCheckmarks((current) => [...current, newCheckmark]);
    setCheckmarkCreation(null);
  }

  async function saveCheckmark(checkmark: ISessionCheckmark, checked: boolean) {
    if (!apiToken) return;
    await updateCheckbox({
      transactionId,
      checkboxId: checkmark.checkboxId,
      checked,
      page: checkmark.page,
      x: checkmark.x,
      y: checkmark.y,
      width: checkmark.width,
      height: checkmark.height,
      label: checkmark.label,
      name: checkmark.name,
      apiToken,
    });
    await refetchDocument();
  }

  function deleteCheckmark(checkmark: ISessionCheckmark) {
    setCheckmarks((current) =>
      current.filter(
        (candidate) => candidate.checkboxId !== checkmark.checkboxId,
      ),
    );
    setActiveCheckmarkId((current) =>
      current === checkmark.checkboxId ? null : current,
    );
  }

  return {
    activateCheckmark,
    cancelCheckmarkCreation,
    confirmCheckmarkCreation,
    saveCheckmark,
    deleteCheckmark,
  };
}
