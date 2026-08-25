import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../shared/Icon/Icon';
import { QrCode } from '../../shared/QrCode/QrCode';
import { Timer } from '../../shared/Timer/Timer';
import {
  startMinisign,
  pollMinisign,
  cancelMinisign,
  startMinisignBulk,
  pollMinisignBulk,
} from '../../../api/minisignSign';
import type {
  BulkMinisignDocument,
  MinisignBulkSession,
  MinisignSession,
} from '../../../api/minisignSign.types';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import { useDialogPosition } from '../../../hooks/useDialogPosition';
import { isSignatureMethodAvailable } from '../../../signatures/signatureMethods';
import { EMAIL_REGEXP, PHONE_REGEXP } from '../../../util/validation';
import type { ISessionRole, ISessionSignature } from '../../../types/session';
import { SignatureMethod } from '../../../types/session';
import styles from './MinisignDialog.module.css';

const POLL_INTERVAL_MS = 5000;

type ChannelOption = 'none' | 'email' | 'sms' | 'both';
type DialogState = 'form' | 'submitting' | 'polling';

interface MinisignDialogProps {
  signature: ISessionSignature;
  roleId: string;
  roleLabel: string;
  transactionId: string;
  apiToken: string;
  isEmailChannelEnabled: boolean;
  isSmsChannelEnabled: boolean;
  onClose: () => void;
  onSigned: (transactionId?: string) => void | Promise<void>;
  hasNextInFlow?: boolean;
  flowProgress?: { current: number; total: number };
  bulkDocuments?: BulkMinisignDocument[];
  roles: ISessionRole[];
  enabledSignatureMethods: SignatureMethod[];
  isSlaveSession: boolean;
  isRemoteSignatureForSlaveAllowed: boolean;
  onNavigateToSignature: (signature: ISessionSignature) => void;
}

interface NavigationTarget {
  signature: ISessionSignature;
  roleId: string;
  roleLabel: string;
}

const ALL_ROLES_KEY = 'all';

export function MinisignDialog({
  signature,
  roleId,
  roleLabel,
  transactionId,
  apiToken,
  isEmailChannelEnabled,
  isSmsChannelEnabled,
  roles,
  enabledSignatureMethods,
  isSlaveSession,
  isRemoteSignatureForSlaveAllowed,
  onNavigateToSignature,
  onClose,
  onSigned,
  hasNextInFlow,
  flowProgress,
  bulkDocuments,
}: MinisignDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [current, setCurrent] = useState<NavigationTarget>({
    signature,
    roleId,
    roleLabel,
  });
  const [currentRoleKey, setCurrentRoleKey] = useState<string>(roleId);
  const [dialogState, setDialogState] = useState<DialogState>('form');
  const [channel, setChannel] = useState<ChannelOption>('none');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [session, setSession] = useState<
    MinisignSession | MinisignBulkSession | null
  >(null);
  const [minisignTimeout, setMinisignTimeout] = useState(0);
  const stoppedRef = useRef(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    stoppedRef.current = false;
    return () => {
      stoppedRef.current = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  const wantsEmail = channel === 'email' || channel === 'both';
  const wantsSms = channel === 'sms' || channel === 'both';
  const isEmailValid = !wantsEmail || EMAIL_REGEXP.test(email);
  const isPhoneValid = !wantsSms || PHONE_REGEXP.test(phone);
  const isFormValid = isEmailValid && isPhoneValid;

  const roleGroups = useMemo(() => {
    return roles
      .map((role) => ({
        roleId: role.roleId,
        roleLabel: role.label,
        targets: role.signatures
          .filter(
            (candidate) =>
              !candidate.transacted &&
              isSignatureMethodAvailable(
                SignatureMethod.MiniSign,
                candidate,
                enabledSignatureMethods,
                isSlaveSession,
                isRemoteSignatureForSlaveAllowed,
              ),
          )
          .map((candidate): NavigationTarget => ({
            signature: candidate,
            roleId: role.roleId,
            roleLabel: role.label,
          })),
      }))
      .filter((group) => group.targets.length > 0);
  }, [
    roles,
    enabledSignatureMethods,
    isSlaveSession,
    isRemoteSignatureForSlaveAllowed,
  ]);

  const allTargets = useMemo(
    () => roleGroups.flatMap((group) => group.targets),
    [roleGroups],
  );

  const activeTargets =
    currentRoleKey === ALL_ROLES_KEY
      ? allTargets
      : (roleGroups.find((group) => group.roleId === currentRoleKey)?.targets ??
        []);

  const currentIndex = activeTargets.findIndex(
    (target) => target.signature.signatureId === current.signature.signatureId,
  );
  const isNavigationEnabled = dialogState === 'form';
  const hasPrevSignature = isNavigationEnabled && currentIndex > 0;
  const hasNextSignature =
    isNavigationEnabled &&
    currentIndex !== -1 &&
    currentIndex < activeTargets.length - 1;

  function navigateTo(target: NavigationTarget) {
    setCurrent(target);
    onNavigateToSignature(target.signature);
  }

  function navigatePrevSignature() {
    if (!hasPrevSignature) return;
    navigateTo(activeTargets[currentIndex - 1]);
  }

  function navigateNextSignature() {
    if (!hasNextSignature) return;
    navigateTo(activeTargets[currentIndex + 1]);
  }

  function handleRoleChange(newRoleKey: string) {
    setCurrentRoleKey(newRoleKey);
    const targets =
      newRoleKey === ALL_ROLES_KEY
        ? allTargets
        : (roleGroups.find((group) => group.roleId === newRoleKey)?.targets ??
          []);
    const stillIncluded = targets.some(
      (target) =>
        target.signature.signatureId === current.signature.signatureId,
    );
    if (!stillIncluded && targets.length > 0) {
      navigateTo(targets[0]);
    }
  }

  function requestClose(
    cancelledSession: MinisignSession | MinisignBulkSession | null,
  ) {
    stoppedRef.current = true;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (cancelledSession && !bulkDocuments) {
      cancelMinisign(
        cancelledSession as MinisignSession,
        false,
        apiToken,
      ).catch(() => {});
    }
    onClose();
  }

  useDialogShortcuts({
    onClose: () => requestClose(session),
    onSubmit: handleSubmit,
    onNavigateNext: navigateNextSignature,
    onNavigatePrev: navigatePrevSignature,
  });

  async function handleSubmit() {
    if (!isFormValid || dialogState !== 'form') return;
    setDialogState('submitting');
    const channels = {
      email: wantsEmail ? email : undefined,
      phone: wantsSms ? phone : undefined,
    };
    try {
      if (bulkDocuments) {
        const result = await startMinisignBulk({
          documents: bulkDocuments,
          channels,
          apiToken,
        });
        if (stoppedRef.current) return;
        setSession(result.session);
        setMinisignTimeout(result.minisignTimeout);
        setDialogState('polling');
        scheduleBulkPoll(result.session);
        return;
      }
      const result = await startMinisign({
        transactionId,
        roleId: current.roleId,
        roleLabel: current.roleLabel,
        signature: current.signature,
        channels,
        apiToken,
      });
      if (stoppedRef.current) return;
      setSession(result.session);
      setMinisignTimeout(result.minisignTimeout);
      setDialogState('polling');
      schedulePoll(result.session);
    } catch {
      if (stoppedRef.current) return;
      setDialogState('form');
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
          await onSigned(transactionId);
          onClose();
        } else {
          schedulePoll(activeSession);
        }
      } catch {
        if (!stoppedRef.current) requestClose(null);
      }
    }, POLL_INTERVAL_MS);
  }

  function scheduleBulkPoll(activeSession: MinisignBulkSession) {
    pollTimeoutRef.current = setTimeout(async () => {
      if (stoppedRef.current) return;
      try {
        const isDone = await pollMinisignBulk(activeSession, apiToken);
        if (stoppedRef.current) return;
        if (isDone) {
          stoppedRef.current = true;
          await onSigned();
          onClose();
        } else {
          scheduleBulkPoll(activeSession);
        }
      } catch {
        if (!stoppedRef.current) requestClose(null);
      }
    }, POLL_INTERVAL_MS);
  }

  function getFormExplanationKey(): string {
    if (isEmailChannelEnabled && isSmsChannelEnabled)
      return 'minisignSignDialog.formExplainationEmailAndSms';
    if (isSmsChannelEnabled) return 'minisignSignDialog.formExplainationSms';
    if (isEmailChannelEnabled)
      return 'minisignSignDialog.formExplainationEmail';
    return 'minisignSignDialog.formExplainationNoChannels';
  }

  function getLinkShareExplanationKey(): string {
    if (wantsEmail && wantsSms)
      return 'minisignSignDialog.linkSentToEmailAndSmsExplanation';
    if (wantsEmail) return 'minisignSignDialog.linkSentToEmailExplanation';
    if (wantsSms) return 'minisignSignDialog.linkSentToSmsExplanation';
    if (isEmailChannelEnabled && isSmsChannelEnabled)
      return 'minisignSignDialog.linkNotSentExplanation.emailAndSmsEnabled';
    if (isSmsChannelEnabled)
      return 'minisignSignDialog.linkNotSentExplanation.smsEnabled';
    if (isEmailChannelEnabled)
      return 'minisignSignDialog.linkNotSentExplanation.emailEnabled';
    return 'minisignSignDialog.linkNotSentExplanation.noChannelEnabled';
  }

  function handleExpired() {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    if (session && !bulkDocuments)
      cancelMinisign(session as MinisignSession, true, apiToken).catch(
        () => {},
      );
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div
        className={styles.dialog}
        data-field-id="modal-minisign"
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
          <span className={styles.title}>{t('minisignSignDialog.title')}</span>
          <div className={styles.controlButtons}>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-minisign-anchor-center"
              onClick={anchorCenter}
              aria-label="Center"
            >
              <Icon name="windowCenter" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-minisign-anchor-bottom-left"
              onClick={anchorBottomLeft}
              aria-label="Bottom left"
            >
              <Icon name="windowLeft" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-minisign-anchor-bottom-right"
              onClick={anchorBottomRight}
              aria-label="Bottom right"
            >
              <Icon name="windowRight" />
            </button>
            <button
              type="button"
              className={styles.controlButton}
              data-field-id="modal-minisign-close"
              onClick={() => requestClose(session)}
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div className={styles.navigation}>
          <span className={styles.signatureText} title={current.signature.text}>
            {current.signature.text}
          </span>
          <span className={styles.signaturePage}>
            ({t('global.page')} {current.signature.page})
            {flowProgress && (
              <span>
                {' '}
                {flowProgress.current} {t('touchpadSignDialog.of')}{' '}
                {flowProgress.total}
              </span>
            )}
          </span>
          {dialogState === 'form' && (
            <div className={styles.navigationControls}>
              <select
                className={styles.roleSelect}
                data-field-id="modal-minisign-role-select"
                value={currentRoleKey}
                onChange={(event) => handleRoleChange(event.target.value)}
                aria-label="Role"
              >
                <option value={ALL_ROLES_KEY}>{t('global.allRoles')}</option>
                {roleGroups.map((group) => (
                  <option key={group.roleId} value={group.roleId}>
                    {group.roleLabel}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.navButton}
                data-field-id="modal-minisign-prev"
                onClick={navigatePrevSignature}
                disabled={!hasPrevSignature}
                aria-label="Previous signature"
              >
                <Icon name="chevronLeft" />
              </button>
              <button
                type="button"
                className={styles.navButton}
                data-field-id="modal-minisign-next"
                onClick={navigateNextSignature}
                disabled={!hasNextSignature}
                aria-label="Next signature"
              >
                <Icon name="chevronRight" />
              </button>
            </div>
          )}
        </div>

        {dialogState === 'form' && (
          <>
            <div className={styles.formBox}>
              <div className={styles.minisignForm}>
                <div className={`${styles.formGroup} ${styles.linkShareGroup}`}>
                  <div className={styles.label}>
                    {t('minisignSignDialog.linkShareSelectLabel')}
                  </div>
                  <select
                    className={styles.select}
                    data-field-id="modal-minisign-channel"
                    value={channel}
                    onChange={(event) =>
                      setChannel(event.target.value as ChannelOption)
                    }
                  >
                    <option value="none">
                      {t('minisignSignDialog.linkShareOptions.none')}
                    </option>
                    {isEmailChannelEnabled && (
                      <option value="email">
                        {t('minisignSignDialog.linkShareOptions.email')}
                      </option>
                    )}
                    {isSmsChannelEnabled && (
                      <option value="sms">
                        {t('minisignSignDialog.linkShareOptions.sms')}
                      </option>
                    )}
                    {isEmailChannelEnabled && isSmsChannelEnabled && (
                      <option value="both">
                        {t('minisignSignDialog.linkShareOptions.both')}
                      </option>
                    )}
                  </select>
                </div>
                {wantsEmail && (
                  <>
                    <div className={styles.formGroup}>
                      <div className={styles.label}>
                        {t('minisignSignDialog.emailLabel')}
                      </div>
                      <input
                        className={styles.input}
                        data-field-id="modal-minisign-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        onBlur={() => setEmailTouched(true)}
                      />
                    </div>
                    {emailTouched && !isEmailValid && (
                      <p className={styles.error}>
                        {email.trim().length === 0
                          ? t('minisignSignDialog.emailRequiredMessage')
                          : t('minisignSignDialog.emailInvalidFormatMessage')}
                      </p>
                    )}
                  </>
                )}
                {wantsSms && (
                  <>
                    <div className={`${styles.formGroup} ${styles.phoneGroup}`}>
                      <div className={styles.label}>
                        {t('minisignSignDialog.phoneLabel')}
                      </div>
                      <input
                        className={styles.input}
                        data-field-id="modal-minisign-phone"
                        type="text"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                      />
                    </div>
                    {phoneTouched && !isPhoneValid && (
                      <p className={styles.error}>
                        {phone.trim().length === 0
                          ? t('minisignSignDialog.phoneRequiredMessage')
                          : t('minisignSignDialog.phoneInvalidFormatMessage')}
                      </p>
                    )}
                  </>
                )}
              </div>
              <p className={styles.explanation}>{t(getFormExplanationKey())}</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.confirmButton}
                data-field-id="modal-minisign-submit"
                onClick={handleSubmit}
                disabled={!isFormValid}
              >
                {hasNextInFlow
                  ? t('touchpadSignDialog.Next')
                  : t('touchpadSignDialog.confirmButton')}
              </button>
            </div>
          </>
        )}

        {dialogState === 'submitting' && (
          <div className={styles.loading}>{t('loadingMessage.pleaseWait')}</div>
        )}

        {dialogState === 'polling' && session && (
          <>
            <div className={styles.pollingBox}>
              <div className={styles.qrSection}>
                <h3 className={styles.sectionTitle}>
                  {t('minisignSignDialog.qrCodeLabel')}
                </h3>
                <QrCode value={session.minisignurl} width={200} height={200} />
              </div>
              <div className={styles.linkShareExplanation}>
                <p className={styles.explanation}>
                  {t(getLinkShareExplanationKey())}
                </p>
              </div>
              <div className={styles.timerSection}>
                <h3 className={styles.sectionTitle}>
                  {t('minisignSignDialog.timerLabel')}
                </h3>
                <Timer
                  time={minisignTimeout}
                  onFinish={handleExpired}
                  className={styles.timerValue}
                />
              </div>
            </div>
            <span className={styles.signingExplanation}>
              {t('minisignSignDialog.signingExplanation')}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
