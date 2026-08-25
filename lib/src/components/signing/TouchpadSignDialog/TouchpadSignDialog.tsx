import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../shared/Icon/Icon';
import { ConfirmDialog } from '../../shared/ConfirmDialog/ConfirmDialog';
import { TouchpadSignCanvas } from './TouchpadSignCanvas';
import type {
  TouchpadSignCanvasHandle,
  TouchpadSignCanvasState,
} from './TouchpadSignCanvas';
import { signTouchSign, signTouchSignBulk } from '../../../api/signPdf';
import type { BulkSignatureDocument } from '../../../api/signPdf.types';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import type { ISessionSignature } from '../../../types/session';
import styles from './TouchpadSignDialog.module.css';

interface TouchpadSignDialogProps {
  signature: ISessionSignature;
  roleId: string;
  roleLabel: string;
  transactionId: string;
  apiToken: string;
  onClose: () => void;
  onSigned: (transactionId?: string) => void | Promise<void>;
  onSignedSuccessfully: () => void;
  hasNextInFlow?: boolean;
  flowProgress?: { current: number; total: number };
  bulkDocuments?: BulkSignatureDocument[];
}

export function TouchpadSignDialog({
  signature,
  roleId,
  roleLabel,
  transactionId,
  apiToken,
  onClose,
  onSigned,
  onSignedSuccessfully,
  hasNextInFlow,
  flowProgress,
  bulkDocuments,
}: TouchpadSignDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const canvasRef = useRef<TouchpadSignCanvasHandle>(null);
  const canvasStateRef = useRef<TouchpadSignCanvasState | null>(null);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  function handleCanvasChange(state: TouchpadSignCanvasState) {
    canvasStateRef.current = state;
    setIsValid(state.isValid);
  }

  function handleClear() {
    canvasRef.current?.reset();
  }

  function handleRequestClose() {
    if (isSubmitting) return;
    if (isValid) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }

  useDialogShortcuts({
    onClose: handleRequestClose,
    onSubmit: handleSubmit,
    onClear: handleClear,
  });

  async function handleSubmit() {
    const canvasState = canvasStateRef.current;
    if (isSubmitting || !isValid || !canvasState?.canvasImage) return;
    setIsSubmitting(true);
    try {
      if (bulkDocuments) {
        await signTouchSignBulk({
          documents: bulkDocuments,
          signatureImg: canvasState.canvasImage,
          strokes: canvasState.strokes,
          apiToken,
        });
      } else {
        await signTouchSign({
          transactionId,
          roleId,
          roleLabel,
          signature,
          signatureImg: canvasState.canvasImage,
          strokes: canvasState.strokes,
          apiToken,
        });
      }
      onSignedSuccessfully();
      await onSigned(transactionId);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-touchpad-sign">
        <div className={styles.header}>
          <span className={styles.title}>{t('touchpadSignDialog.title')}</span>
          <button
            type="button"
            className={styles.closeButton}
            data-field-id="modal-touchpad-sign-close"
            onClick={handleRequestClose}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className={styles.navigation}>
          <span className={styles.signatureText} title={signature.text}>
            {signature.text}
          </span>
          <span className={styles.signaturePage}>
            ({t('global.page')} {signature.page})
            {flowProgress && (
              <span>
                {' '}
                {flowProgress.current} {t('touchpadSignDialog.of')}{' '}
                {flowProgress.total}
              </span>
            )}
          </span>
        </div>
        <div className={styles.content}>
          {}
          <div className={isSubmitting ? styles.canvasHidden : undefined}>
            <TouchpadSignCanvas
              ref={canvasRef}
              label={signature.text}
              onChange={handleCanvasChange}
            />
          </div>
          {isSubmitting && (
            <div className={styles.loading}>
              {t('loadingMessage.pleaseWait')}
            </div>
          )}
        </div>
        {!isSubmitting && (
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.clearButton}
              data-field-id="modal-touchpad-sign-clear"
              onClick={handleClear}
            >
              {t('touchpadSignDialog.clearButton')}
            </button>
            <button
              type="button"
              className={styles.submitButton}
              data-field-id="modal-touchpad-sign-submit"
              onClick={handleSubmit}
              disabled={!isValid}
            >
              {hasNextInFlow
                ? t('touchpadSignDialog.Next')
                : t('touchpadSignDialog.confirmButton')}
            </button>
          </div>
        )}
      </div>
      {showDiscardConfirm && (
        <ConfirmDialog
          title={t('touchpadSignatureCancelConfirmationDialog.title')}
          messageLines={[
            t('touchpadSignatureCancelConfirmationDialog.messageLine'),
            t('touchpadSignatureCancelConfirmationDialog.messageLine2'),
          ]}
          cancelLabel={t(
            'touchpadSignatureCancelConfirmationDialog.cancelButton',
          )}
          confirmLabel={t(
            'touchpadSignatureCancelConfirmationDialog.saveButton',
          )}
          onCancel={() => setShowDiscardConfirm(false)}
          onConfirm={() => {
            setShowDiscardConfirm(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
