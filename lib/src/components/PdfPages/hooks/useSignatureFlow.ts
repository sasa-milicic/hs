import { useRef, useState } from 'react';
import { SignatureMethod } from '../../../types/session';
import type {
  BatchSession,
  ISessionRole,
  ISessionSignature,
} from '../../../types/session';
import type { PageSignature } from '../PdfPages';
import type { BulkSignDocument } from '../NewSignatureFlowDialog';

export interface FlowAwareHandlers {
  onSigned: (signedTransactionId?: string) => Promise<void>;
  onClose: () => void;
}

export interface BulkSignatureTargetsForDocument {
  transactionId: string;
  targets: {
    roleId: string;
    roleLabel: string;
    signature: ISessionSignature;
  }[];
}

export interface UseSignatureFlowParams {
  roles: ISessionRole[];
  batchSessions: BatchSession[];
  getArchivedRoles: (transactionId: string) => ISessionRole[] | undefined;
  onSigned: (bulkTransactionIds?: string[]) => void | Promise<void>;
  setOpenTouchpadSignature: (value: PageSignature | null) => void;
  setOpenMinisignSignature: (value: PageSignature | null) => void;
  setOpenQualifiedSignature: (value: PageSignature | null) => void;
  setOpenStampSignature: (value: PageSignature | null) => void;
}

export interface UseSignatureFlowResult {
  touchpadFlowHandlers: FlowAwareHandlers;
  minisignFlowHandlers: FlowAwareHandlers;
  qualifiedFlowHandlers: FlowAwareHandlers;
  stampSignFlowHandlers: FlowAwareHandlers;
  flowProgressFor: (
    method: SignatureMethod,
  ) => { current: number; total: number } | undefined;
  bulkDocumentsFor: (
    method: SignatureMethod,
  ) => BulkSignatureTargetsForDocument[] | undefined;
  hasNextInFlow: (method: SignatureMethod) => boolean;
  startSignatureFlow: (method: SignatureMethod, remainingIds: string[]) => void;
  startBulkSign: (
    method: SignatureMethod,
    documents: BulkSignDocument[],
  ) => void;
}

export function useSignatureFlow({
  roles,
  batchSessions,
  getArchivedRoles,
  onSigned,
  setOpenTouchpadSignature,
  setOpenMinisignSignature,
  setOpenQualifiedSignature,
  setOpenStampSignature,
}: UseSignatureFlowParams): UseSignatureFlowResult {
  const [bulkSignSession, setBulkSignSession] = useState<{
    method: SignatureMethod;
    documents: BulkSignDocument[];
  } | null>(null);

  const [signatureFlowQueue, setSignatureFlowQueue] = useState<{
    method: SignatureMethod;
    remainingIds: string[];
    total: number;
  } | null>(null);
  const flowContinuationRef = useRef<PageSignature | null>(null);
  const flowSuccessRef = useRef(false);

  function findPageSignatureById(signatureId: string): PageSignature | null {
    for (const role of roles) {
      const signature = role.signatures.find(
        (candidate) => candidate.signatureId === signatureId,
      );
      if (signature)
        return { signature, roleId: role.roleId, roleLabel: role.label };
    }
    for (const session of batchSessions) {
      const siblingRoles =
        getArchivedRoles(session.transactionId) ??
        session.signatureRolesDTO.roles;
      for (const role of siblingRoles) {
        const signature = role.signatures.find(
          (candidate) => candidate.signatureId === signatureId,
        );
        if (signature) {
          return {
            signature,
            roleId: role.roleId,
            roleLabel: role.label,
            transactionId: session.transactionId,
          };
        }
      }
    }
    return null;
  }

  function createFlowAwareHandlers(
    method: SignatureMethod,
    setOpen: (value: PageSignature | null) => void,
  ): FlowAwareHandlers {
    return {
      async onSigned(signedTransactionId?: string) {
        const transactionIdsToInvalidate =
          bulkSignSession?.method === method
            ? bulkSignSession.documents.map(
                (document) => document.transactionId,
              )
            : signedTransactionId
              ? [signedTransactionId]
              : undefined;
        await onSigned(transactionIdsToInvalidate);
        flowSuccessRef.current = true;
        if (signatureFlowQueue?.method !== method) {
          flowContinuationRef.current = null;
          return;
        }
        const [nextId, ...rest] = signatureFlowQueue.remainingIds;
        const next = nextId ? findPageSignatureById(nextId) : null;
        flowContinuationRef.current = next;
        setSignatureFlowQueue(
          next
            ? { method, remainingIds: rest, total: signatureFlowQueue.total }
            : null,
        );
      },
      onClose() {
        if (bulkSignSession?.method === method) setBulkSignSession(null);
        if (!flowSuccessRef.current) {
          if (signatureFlowQueue?.method === method)
            setSignatureFlowQueue(null);
          setOpen(null);
          return;
        }
        flowSuccessRef.current = false;
        setOpen(flowContinuationRef.current);
        flowContinuationRef.current = null;
      },
    };
  }

  function flowProgressFor(
    method: SignatureMethod,
  ): { current: number; total: number } | undefined {
    if (signatureFlowQueue?.method !== method) return undefined;
    return {
      current:
        signatureFlowQueue.total - signatureFlowQueue.remainingIds.length,
      total: signatureFlowQueue.total,
    };
  }

  function bulkDocumentsFor(
    method: SignatureMethod,
  ): BulkSignatureTargetsForDocument[] | undefined {
    if (bulkSignSession?.method !== method) return undefined;
    return bulkSignSession.documents.map((document) => ({
      transactionId: document.transactionId,
      targets: document.targets.map((pageSignature) => ({
        roleId: pageSignature.roleId,
        roleLabel: pageSignature.roleLabel,
        signature: pageSignature.signature,
      })),
    }));
  }

  function hasNextInFlow(method: SignatureMethod): boolean {
    return (
      signatureFlowQueue?.method === method &&
      signatureFlowQueue.remainingIds.length > 0
    );
  }

  function startSignatureFlow(method: SignatureMethod, remainingIds: string[]) {
    setSignatureFlowQueue({
      method,
      remainingIds,
      total: remainingIds.length + 1,
    });
  }

  function startBulkSign(
    method: SignatureMethod,
    documents: BulkSignDocument[],
  ) {
    setBulkSignSession({ method, documents });
  }

  return {
    touchpadFlowHandlers: createFlowAwareHandlers(
      SignatureMethod.TouchpadSignature,
      setOpenTouchpadSignature,
    ),
    minisignFlowHandlers: createFlowAwareHandlers(
      SignatureMethod.MiniSign,
      setOpenMinisignSignature,
    ),
    qualifiedFlowHandlers: createFlowAwareHandlers(
      SignatureMethod.QualifiedSignature,
      setOpenQualifiedSignature,
    ),
    stampSignFlowHandlers: createFlowAwareHandlers(
      SignatureMethod.StampSign,
      setOpenStampSignature,
    ),
    flowProgressFor,
    bulkDocumentsFor,
    hasNextInFlow,
    startSignatureFlow,
    startBulkSign,
  };
}
