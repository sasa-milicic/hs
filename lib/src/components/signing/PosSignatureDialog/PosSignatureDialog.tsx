import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../shared/Icon/Icon';
import { Timer } from '../../shared/Timer/Timer';
import {
  startMinisign,
  pollMinisign,
  cancelMinisign,
} from '../../../api/minisignSign';
import type { MinisignSession } from '../../../api/minisignSign.types';
import { checkPosBind, startPosSignature } from '../../../api/posSignature';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import { useDialogPosition } from '../../../hooks/useDialogPosition';
import type { ISessionSignature } from '../../../types/session';
import styles from './PosSignatureDialog.module.css';

const POLL_INTERVAL_MS = 5000;

type PosState = 'binding' | 'loading' | 'polling';

interface PosSignatureDialogProps {
  signature: ISessionSignature;
  roleId: string;
  roleLabel: string;
  transactionId: string;
  apiToken: string;
  posUsername: string;
  onClose: () => void;
  onSigned: () => void | Promise<void>;
  onBindChecked: (isBound: boolean) => void;
}

export function PosSignatureDialog({
  signature,
  roleId,
  roleLabel,
  transactionId,
  apiToken,
  posUsername,
  onClose,
  onSigned,
  onBindChecked,
}: PosSignatureDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [posState, setPosState] = useState<PosState>('binding');
  const [session, setSession] = useState<MinisignSession | null>(null);
  const [minisignTimeout, setMinisignTimeout] = useState(0);
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
  const stoppedRef = useRef(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stoppedRef.current = false;
    checkPosBind(transactionId, apiToken)
      .then((result) => {
        if (stoppedRef.current) return;
        onBindChecked(!!result);
        startSession();
      })
      .catch(() => {
        if (!stoppedRef.current) startSession();
      });
    return () => {
      stoppedRef.current = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSession() {
    setPosState('loading');
    try {
      const result = await startMinisign({
        transactionId,
        roleId,
        roleLabel,
        signature,
        channels: {},
        apiToken,
      });
      if (stoppedRef.current) return;
      await startPosSignature({
        posMinisignUrl: result.session.minisignurl,
        posUsername,
        uuid: result.session.uuid,
        apiToken,
      });
      if (stoppedRef.current) return;
      setSession(result.session);
      setMinisignTimeout(result.minisignTimeout);
      setPosState('polling');
      schedulePoll(result.session);
    } catch {
      if (!stoppedRef.current) setPosState('binding');
    }
  }

  function schedulePoll(activeSession: MinisignSession) {
    pollTimeoutRef.current = setTimeout(async () => {
      if (stoppedRef.current) return;
      try {
        const isDone = await pollMinisign(activeSession, apiToken);
        if (stoppedRef.current) return;
        if (isDone) {
          stoppedRef.current = true;
          await onSigned();
          onClose();
        } else {
          schedulePoll(activeSession);
        }
      } catch {
        if (!stoppedRef.current) requestClose(null);
      }
    }, POLL_INTERVAL_MS);
  }

  useDialogShortcuts({
    onClose: () => requestClose(session),
    onSubmit: () => {},
  });

  function requestClose(cancelledSession: MinisignSession | null) {
    stoppedRef.current = true;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (cancelledSession)
      cancelMinisign(cancelledSession, false, apiToken).catch(() => {});
    onClose();
  }

  function handleExpired() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (session) cancelMinisign(session, true, apiToken).catch(() => {});
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        data-field-id="modal-pos-signature"
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
          <span className={styles.title}>{t('posSignatureDialog.title')}</span>
          <div className={styles.controlButtons}>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-pos-signature-anchor-center"
              onClick={anchorCenter}
              aria-label="Center"
            >
              <Icon name="windowCenter" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-pos-signature-anchor-bottom-left"
              onClick={anchorBottomLeft}
              aria-label="Bottom left"
            >
              <Icon name="windowLeft" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-pos-signature-anchor-bottom-right"
              onClick={anchorBottomRight}
              aria-label="Bottom right"
            >
              <Icon name="windowRight" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-pos-signature-close"
              onClick={() => requestClose(session)}
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
        <div className={styles.loadingWrapper}>
          {posState === 'polling' && minisignTimeout > 0 && (
            <div className={styles.timerColumn}>
              <h3 className={styles.timerTitle}>
                {t('posSignatureDialog.timerTitle')}:
              </h3>
              <Timer
                time={minisignTimeout}
                onFinish={handleExpired}
                className={styles.timerValue}
              />
            </div>
          )}
          <p className={styles.loadingText}>
            {posState === 'polling'
              ? t('posSignatureDialog.signingStatus')
              : t('posSignatureDialog.bindingStatus')}
          </p>
          <div className={styles.loadingBar}>
            {t('loadingMessage.pleaseWait')}
          </div>
        </div>
      </div>
    </div>
  );
}
