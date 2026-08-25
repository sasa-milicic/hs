import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../shared/Icon/Icon';
import { isSignatureMethodAvailable } from '../../signatures/signatureMethods';
import { I18N_OPTIONS } from '../../i18n/i18n';
import { useDialogShortcuts } from '../../hooks/useDialogShortcuts';
import type { BatchSession, ISessionRole } from '../../types/session';
import { SignatureMethod } from '../../types/session';
import type { MethodDescriptor, PageSignature } from './PdfPages';
import styles from './NewSignatureFlowDialog.module.css';

export interface BulkSignDocument {
  transactionId: string;
  targets: PageSignature[];
}

interface NewSignatureFlowDialogProps {
  roles: ISessionRole[];
  methodDescriptors: MethodDescriptor[];
  enabledSignatureMethods: SignatureMethod[];
  isSlaveSession: boolean;
  isRemoteSignatureForSlaveAllowed: boolean;
  transactionId: string;
  batchSessions: BatchSession[];
  getArchivedRoles: (transactionId: string) => ISessionRole[] | undefined;
  onClose: () => void;
  onStartSignatureFlow: (
    method: SignatureMethod,
    remainingSignatureIds: string[],
  ) => void;
  isBulkSignatureEnabled: boolean;
  onStartBulkSign: (
    method: SignatureMethod,
    documents: BulkSignDocument[],
  ) => void;
}

function matchingSignaturesForSignee(
  roles: ISessionRole[],
  text: string,
): PageSignature[] {
  const list: PageSignature[] = [];
  for (const role of roles) {
    for (const signature of role.signatures) {
      if (!signature.transacted && signature.text === text) {
        list.push({ signature, roleId: role.roleId, roleLabel: role.label });
      }
    }
  }
  return list;
}

const BULK_ALLOWED_METHODS = [
  SignatureMethod.TouchpadSignature,
  SignatureMethod.MiniSign,
];

export function NewSignatureFlowDialog({
  roles,
  methodDescriptors,
  enabledSignatureMethods,
  isSlaveSession,
  isRemoteSignatureForSlaveAllowed,
  transactionId,
  batchSessions,
  getArchivedRoles,
  onClose,
  onStartSignatureFlow,
  isBulkSignatureEnabled,
  onStartBulkSign,
}: NewSignatureFlowDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [isBulkSignature, setIsBulkSignature] = useState(false);

  const unsignedPageSignatures = useMemo(() => {
    const list: PageSignature[] = [];
    for (const role of roles) {
      for (const signature of role.signatures) {
        if (!signature.transacted)
          list.push({ signature, roleId: role.roleId, roleLabel: role.label });
      }
    }
    return list;
  }, [roles]);

  const allBatchUnsignedSignatures = useMemo(() => {
    const activeIndex = batchSessions.findIndex(
      (session) => session.transactionId === transactionId,
    );
    if (activeIndex === -1) return unsignedPageSignatures;
    const combined: PageSignature[] = [];
    for (const session of batchSessions) {
      if (session.transactionId === transactionId) {
        combined.push(...unsignedPageSignatures);
        continue;
      }
      const siblingRoles =
        getArchivedRoles(session.transactionId) ??
        session.signatureRolesDTO.roles;
      for (const role of siblingRoles) {
        for (const signature of role.signatures) {
          if (!signature.transacted) {
            combined.push({
              signature,
              roleId: role.roleId,
              roleLabel: role.label,
              transactionId: session.transactionId,
            });
          }
        }
      }
    }
    return combined;
  }, [batchSessions, transactionId, unsignedPageSignatures, getArchivedRoles]);

  const uniqueSignees = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const pageSignature of allBatchUnsignedSignatures) {
      const key = pageSignature.signature.text.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(pageSignature.signature.text);
      }
    }
    return result;
  }, [allBatchUnsignedSignatures]);

  const [selectedText, setSelectedText] = useState(
    () => uniqueSignees[0] ?? '',
  );

  useDialogShortcuts({ onClose, onSubmit: () => {} });

  const matchingSignatures = useMemo(
    () => matchingSignaturesForSignee(roles, selectedText),
    [roles, selectedText],
  );
  const orderedBatchMatches = useMemo(() => {
    const activeIndex = batchSessions.findIndex(
      (session) => session.transactionId === transactionId,
    );
    if (activeIndex === -1) return matchingSignatures;
    const combined: PageSignature[] = [];
    for (const session of batchSessions) {
      if (session.transactionId === transactionId) {
        combined.push(...matchingSignatures);
        continue;
      }
      const siblingRoles =
        getArchivedRoles(session.transactionId) ??
        session.signatureRolesDTO.roles;
      for (const pageSignature of matchingSignaturesForSignee(
        siblingRoles,
        selectedText,
      )) {
        combined.push({
          ...pageSignature,
          transactionId: session.transactionId,
        });
      }
    }
    return combined;
  }, [
    batchSessions,
    transactionId,
    matchingSignatures,
    getArchivedRoles,
    selectedText,
  ]);
  const representative = orderedBatchMatches[0] ?? null;

  const availableMethods = useMemo(() => {
    if (!representative) return [];
    const methods = methodDescriptors.filter((descriptor) =>
      isSignatureMethodAvailable(
        descriptor.method,
        representative.signature,
        enabledSignatureMethods,
        isSlaveSession,
        isRemoteSignatureForSlaveAllowed,
      ),
    );
    return isBulkSignature
      ? methods.filter((descriptor) =>
          BULK_ALLOWED_METHODS.includes(descriptor.method),
        )
      : methods;
  }, [
    representative,
    methodDescriptors,
    enabledSignatureMethods,
    isSlaveSession,
    isRemoteSignatureForSlaveAllowed,
    isBulkSignature,
  ]);

  const [selectedMethodKey, setSelectedMethodKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (availableMethods.length === 1) {
      setSelectedMethodKey(availableMethods[0].key);
    } else if (
      !availableMethods.some((method) => method.key === selectedMethodKey)
    ) {
      setSelectedMethodKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableMethods]);

  function handleNext() {
    if (!representative || !selectedMethodKey) return;
    const descriptor = methodDescriptors.find(
      (method) => method.key === selectedMethodKey,
    );
    if (!descriptor) return;
    onClose();
    if (isBulkSignature) {
      const documents: BulkSignDocument[] = [];
      if (matchingSignatures.length > 0)
        documents.push({ transactionId, targets: matchingSignatures });
      for (const batchSession of batchSessions) {
        if (batchSession.transactionId === transactionId) continue;
        const siblingRoles =
          getArchivedRoles(batchSession.transactionId) ??
          batchSession.signatureRolesDTO.roles;
        const siblingTargets = matchingSignaturesForSignee(
          siblingRoles,
          selectedText,
        );
        if (siblingTargets.length > 0) {
          documents.push({
            transactionId: batchSession.transactionId,
            targets: siblingTargets,
          });
        }
      }
      onStartBulkSign(descriptor.method, documents);
      descriptor.open(representative);
      return;
    }
    const remainingIds = orderedBatchMatches
      .slice(1)
      .map((pageSignature) => pageSignature.signature.signatureId);
    onStartSignatureFlow(descriptor.method, remainingIds);
    descriptor.open(representative);
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-new-signature-flow">
        {isBulkSignatureEnabled && (
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={isBulkSignature}
              onChange={(event) => setIsBulkSignature(event.target.checked)}
            />
            <span>{t('newSignatureFlow.title')}</span>
          </label>
        )}
        <div className={styles.signee}>
          <label className={styles.signeeLabel}>
            {t('signaturesDialog.signeeFieldLabel')}:
          </label>
          <select
            className={styles.signeeSelect}
            data-field-id="modal-new-signature-flow-signee-select"
            value={selectedText}
            onChange={(event) => setSelectedText(event.target.value)}
          >
            {uniqueSignees.map((text) => (
              <option key={text} value={text}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.methods}>
          {availableMethods.length > 0 ? (
            availableMethods.map((method) => (
              <label key={method.key} className={styles.methodOption}>
                <input
                  type="radio"
                  name="signature-method"
                  data-field-id={`modal-new-signature-flow-method-${method.key}`}
                  checked={selectedMethodKey === method.key}
                  onChange={() => setSelectedMethodKey(method.key)}
                />
                <Icon name={method.icon} />
                <span>{method.label}</span>
              </label>
            ))
          ) : (
            <p className={styles.noOptions}>
              {t('newSignatureFlow.noOptionsAvailable')}
            </p>
          )}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            data-field-id="modal-new-signature-flow-cancel"
            onClick={onClose}
          >
            {t('signaturesDialog.Cancel')}
          </button>
          <button
            type="button"
            className={styles.nextButton}
            data-field-id="modal-new-signature-flow-next"
            onClick={handleNext}
            disabled={!selectedMethodKey}
          >
            {t('signaturesDialog.Next')}
          </button>
        </div>
      </div>
    </div>
  );
}
