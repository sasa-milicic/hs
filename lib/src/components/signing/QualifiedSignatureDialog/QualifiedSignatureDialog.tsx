import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../shared/Icon/Icon';
import { startQualSign, continueQualSign } from '../../../api/qualifiedSign';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import { useDialogPosition } from '../../../hooks/useDialogPosition';
import type { ISessionSignature } from '../../../types/session';
import styles from './QualifiedSignatureDialog.module.css';

interface QualifiedSignatureDialogProps {
  signature: ISessionSignature;
  roleId: string;
  roleLabel: string;
  transactionId: string;
  apiToken: string;
  onClose: () => void;
  onSigned: (transactionId?: string) => void | Promise<void>;
}

export function QualifiedSignatureDialog({
  signature,
  roleId,
  roleLabel,
  transactionId,
  apiToken,
  onClose,
  onSigned,
}: QualifiedSignatureDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [embeddedHtml, setEmbeddedHtml] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const stoppedRef = useRef(false);
  const {
    dialogRef,
    dialogStyle,
    anchorCenter,
    anchorBottomLeft,
    anchorBottomRight,
    handleDragPointerDown,
    handleDragPointerMove,
    handleDragPointerUp,
  } = useDialogPosition();

  useDialogShortcuts({ onClose, onSubmit: () => {} });

  useEffect(() => {
    stoppedRef.current = false;
    startQualSign({ transactionId, roleId, roleLabel, signature, apiToken })
      .then((result) => {
        if (stoppedRef.current) return;
        sessionIdRef.current = result.sessionId;
        setEmbeddedHtml(result.embeddedHtml);
      })
      .catch(() => {
        if (!stoppedRef.current) onClose();
      });
    return () => {
      stoppedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data === 'qualSignSuccess') {
        finishProcess();
      } else if (event.data === 'qualSignError') {
        onClose();
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishProcess() {
    const sessionId = sessionIdRef.current;
    if (!sessionId || stoppedRef.current) return;
    stoppedRef.current = true;
    try {
      await continueQualSign({
        transactionId,
        roleId,
        roleLabel,
        signature,
        sessionId,
        apiToken,
      });
      await onSigned(transactionId);
    } finally {
      onClose();
    }
  }

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        data-field-id="modal-qualified-signature"
        ref={dialogRef}
        style={dialogStyle}
      >
        <div
          className={styles.dragHandle}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onPointerCancel={handleDragPointerUp}
          onLostPointerCapture={handleDragPointerUp}
        />
        <div className={styles.header}>
          <span className={styles.title}>
            {t('addNewSignatureDialog.qualSignatureOption')}
          </span>
          <div className={styles.controlButtons}>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-qualified-signature-anchor-center"
              onClick={anchorCenter}
              aria-label="Center"
            >
              <Icon name="windowCenter" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-qualified-signature-anchor-bottom-left"
              onClick={anchorBottomLeft}
              aria-label="Bottom left"
            >
              <Icon name="windowLeft" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-qualified-signature-anchor-bottom-right"
              onClick={anchorBottomRight}
              aria-label="Bottom right"
            >
              <Icon name="windowRight" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-qualified-signature-close"
              onClick={onClose}
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className={styles.navigation}>
          <span className={styles.signatureText} title={signature.text}>
            {signature.text}
          </span>
          <span className={styles.signaturePage}>
            ({t('global.page')} {signature.page})
          </span>
        </div>
        {embeddedHtml ? (
          <iframe
            title="Qualified signature"
            srcDoc={embeddedHtml}
            width={420}
            height={280}
            className={styles.embeddedForm}
          />
        ) : (
          <div className={styles.loading}>{t('loadingMessage.pleaseWait')}</div>
        )}
      </div>
    </div>
  );
}
