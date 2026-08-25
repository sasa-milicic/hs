import { useState } from 'react';
import {
  cancelSession,
  saveSession,
  saveSessionBulk,
  startNewFlow,
} from '../../api/sessionActions';
import type {
  BatchSession,
  ISessionSignature,
  ISessionStamp,
  ISessionCheckmark,
  ISessionRole,
} from '../../types/session';
import type { SessionEndEvent } from '../../types/sessionEnd';

export type SessionConfirmDialogKind =
  | 'cancel'
  | 'save'
  | 'saveFinalizable'
  | 'saveTempOnly'
  | 'saveTempNonFinalizable'
  | 'igvSaveFinalize'
  | 'igvSaveTemp'
  | null;

export interface UseSessionActionsParams {
  transactionId: string;
  tenantId: string;
  language: string;
  secretKey: string | undefined;
  apiToken: string | null;
  setIsSessionLocked: (value: boolean) => void;
  isDocumentFinalizable: boolean;
  isSlaveSession: boolean;
  standAloneUI: boolean;
  isLite: boolean;
  skipsCancelConfirmation: boolean;
  isIGV: boolean;
  remoteSignatureValidityUntil: string;
  allSignatures: ISessionSignature[];
  stamps: ISessionStamp[];
  checkmarks: ISessionCheckmark[];
  roles: ISessionRole[];
  batchSessions: BatchSession[];
  getArchivedRoles: (transactionId: string) => ISessionRole[] | undefined;
  onSessionEnd: ((event: SessionEndEvent) => void) | undefined;
}

export interface UseSessionActionsResult {
  confirmDialogKind: SessionConfirmDialogKind;
  setConfirmDialogKind: (kind: SessionConfirmDialogKind) => void;
  canFinalize: boolean;
  areSessionActionsVisible: boolean;
  isEverythingSigned: boolean;
  isRemoteSignatureSession: boolean;
  handleCancelClick: () => void;
  handleFinalizeClick: () => void;
  handleTempSaveClick: () => void;
  confirmCancel: () => Promise<void>;
  confirmSave: (temporarySave: boolean) => Promise<void>;
  handleRemoteSignatureSent: (deliveryChannel: string) => void;
  confirmStartWorkflow: () => Promise<void>;
}

export function useSessionActions({
  transactionId,
  tenantId,
  language,
  secretKey,
  apiToken,
  setIsSessionLocked,
  isDocumentFinalizable,
  isSlaveSession,
  standAloneUI,
  isLite,
  skipsCancelConfirmation,
  isIGV,
  remoteSignatureValidityUntil,
  allSignatures,
  stamps,
  checkmarks,
  roles,
  batchSessions,
  getArchivedRoles,
  onSessionEnd,
}: UseSessionActionsParams): UseSessionActionsResult {
  const [confirmDialogKind, setConfirmDialogKind] =
    useState<SessionConfirmDialogKind>(null);

  const batchHasSignableContent = batchSessions.some((session) => {
    const siblingRoles =
      getArchivedRoles(session.transactionId) ??
      session.signatureRolesDTO.roles;
    return siblingRoles.some((role) => role.signatures.length > 0);
  });
  const areSessionActionsVisible =
    allSignatures.length > 0 ||
    stamps.length > 0 ||
    checkmarks.length > 0 ||
    batchHasSignableContent;
  const canFinalize =
    ((allSignatures.length === 0 ||
      allSignatures.every(
        (signature) => !signature.mandatory || signature.transacted,
      )) &&
      (checkmarks.length === 0 ||
        checkmarks.every((checkmark) => checkmark.checked))) ||
    stamps.length > 0;
  const isEverythingSigned =
    allSignatures.every((signature) => signature.transacted) &&
    batchSessions.every((session) => {
      const siblingRoles =
        getArchivedRoles(session.transactionId) ??
        session.signatureRolesDTO.roles;
      return siblingRoles.every((role) =>
        role.signatures.every((signature) => signature.transacted),
      );
    });
  const isRemoteSignatureSession =
    isSlaveSession && !!remoteSignatureValidityUntil;
  const hasIncompleteSignaturesOrCheckmarks =
    allSignatures.some((signature) => !signature.transacted) ||
    checkmarks.some((checkmark) => !checkmark.checked);

  function handleCancelClick() {
    if (skipsCancelConfirmation) {
      confirmCancel();
      return;
    }
    setConfirmDialogKind('cancel');
  }

  function handleFinalizeClick() {
    if (isIGV) {
      if (hasIncompleteSignaturesOrCheckmarks) {
        setConfirmDialogKind('igvSaveFinalize');
      } else {
        confirmSave(false);
      }
      return;
    }
    if (isLite) {
      confirmSave(false);
      return;
    }
    if (!isDocumentFinalizable) {
      setConfirmDialogKind('save');
      return;
    }
    setConfirmDialogKind(canFinalize ? 'saveFinalizable' : 'saveTempOnly');
  }

  function handleTempSaveClick() {
    if (isIGV) {
      if (hasIncompleteSignaturesOrCheckmarks) {
        setConfirmDialogKind('igvSaveTemp');
      } else {
        confirmSave(true);
      }
      return;
    }
    if (isLite) {
      confirmSave(true);
      return;
    }
    setConfirmDialogKind(
      isDocumentFinalizable ? 'saveTempOnly' : 'saveTempNonFinalizable',
    );
  }

  function saveActiveSession(
    temporarySave: boolean,
    resolvedApiToken: string,
  ): Promise<void> {
    if (batchSessions.length === 0) {
      return saveSession({
        transactionId,
        temporarySave,
        roles,
        secretKey,
        apiToken: resolvedApiToken,
      });
    }
    const documents = batchSessions.map((doc) =>
      doc.transactionId === transactionId
        ? { transactionId, secretKey: secretKey ?? doc.secretKey, roles }
        : {
            transactionId: doc.transactionId,
            secretKey: doc.secretKey,
            roles: doc.signatureRolesDTO.roles,
          },
    );
    return saveSessionBulk({
      documents,
      temporarySave,
      apiToken: resolvedApiToken,
    });
  }

  async function confirmCancel() {
    setConfirmDialogKind(null);
    if (!apiToken) return;
    setIsSessionLocked(true);
    try {
      await cancelSession({ transactionId, apiToken });
      onSessionEnd?.({
        reason: 'Canceled',
        transactionId,
        tenantId,
        locale: language,
      });
    } catch {
      setIsSessionLocked(false);
    }
  }

  async function confirmSave(temporarySave: boolean) {
    setConfirmDialogKind(null);
    if (!apiToken) return;
    setIsSessionLocked(true);
    const resolvedTemporarySave = standAloneUI ? true : temporarySave;
    try {
      await saveActiveSession(resolvedTemporarySave, apiToken);
      onSessionEnd?.({
        reason: 'Finalized',
        transactionId,
        tenantId,
        locale: language,
        isTemporarySave: resolvedTemporarySave,
      });
    } catch {
      setIsSessionLocked(false);
    }
  }

  function handleRemoteSignatureSent(deliveryChannel: string) {
    setIsSessionLocked(true);
    onSessionEnd?.({
      reason: 'RemoteSignatureProcessing',
      transactionId,
      tenantId,
      locale: language,
      deliveryChannel,
    });
  }

  async function confirmStartWorkflow() {
    if (!apiToken) return;
    setIsSessionLocked(true);
    try {
      await saveActiveSession(true, apiToken);
      await startNewFlow({ transactionId, secretKey, apiToken });
      onSessionEnd?.({
        reason: 'SignatureWorkflow',
        transactionId,
        tenantId,
        locale: language,
        isTemporarySave: true,
      });
    } catch {
      setIsSessionLocked(false);
    }
  }

  return {
    confirmDialogKind,
    setConfirmDialogKind,
    canFinalize,
    areSessionActionsVisible,
    isEverythingSigned,
    isRemoteSignatureSession,
    handleCancelClick,
    handleFinalizeClick,
    handleTempSaveClick,
    confirmCancel,
    confirmSave,
    handleRemoteSignatureSent,
    confirmStartWorkflow,
  };
}
