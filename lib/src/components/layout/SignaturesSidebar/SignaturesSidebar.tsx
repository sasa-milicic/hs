import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../shared/Icon/Icon';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import type {
  ISessionRole,
  ISessionSignature,
  ISessionStamp,
  ISessionCheckmark,
  BatchSession,
} from '../../../types/session';
import styles from './SignaturesSidebar.module.css';

interface SignaturesSidebarProps {
  roles: ISessionRole[];
  activeSignatureId: string | null;
  onSignatureClick: (signature: ISessionSignature) => void;
  stamps: ISessionStamp[];
  activeStampId: string | null;
  onStampClick: (stamp: ISessionStamp) => void;
  areAdditionalStampsAllowed: boolean;
  isSessionLocked: boolean;
  isStampCreateDisabled: boolean;
  onAddStampClick: () => void;
  checkmarks: ISessionCheckmark[];
  activeCheckmarkId: string | null;
  onCheckmarkClick: (checkmark: ISessionCheckmark) => void;
  areAdditionalCheckboxesAllowed: boolean;
  isCheckmarkCreateDisabled: boolean;
  onAddCheckmarkClick: () => void;
  onShortcutsClick: () => void;
  showShortcutsButton: boolean;
  canInviteNewUser: boolean;
  onInviteClick: () => void;
  canStartWorkflow: boolean;
  onStartWorkflowClick: () => void;
  areAdditionalSignaturesAllowed: boolean;
  isSignatureCreateDisabled: boolean;
  onAddSignatureClick: () => void;
  batchSessions: BatchSession[];
  activeTransactionId: string;
  onDocumentClick: (session: BatchSession) => void;
  variant?: 'overlay' | 'accordion';
}

export function SignaturesSidebar({
  roles,
  activeSignatureId,
  onSignatureClick,
  stamps,
  activeStampId,
  onStampClick,
  areAdditionalStampsAllowed,
  isSessionLocked,
  isStampCreateDisabled,
  onAddStampClick,
  checkmarks,
  activeCheckmarkId,
  onCheckmarkClick,
  areAdditionalCheckboxesAllowed,
  isCheckmarkCreateDisabled,
  onAddCheckmarkClick,
  onShortcutsClick,
  showShortcutsButton,
  canInviteNewUser,
  onInviteClick,
  canStartWorkflow,
  onStartWorkflowClick,
  areAdditionalSignaturesAllowed,
  isSignatureCreateDisabled,
  onAddSignatureClick,
  batchSessions,
  activeTransactionId,
  onDocumentClick,
  variant,
}: SignaturesSidebarProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [expandedRoleIds, setExpandedRoleIds] = useState<Set<string>>(
    new Set(),
  );
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(true);
  const hasMandatorySignature = roles.some((role) =>
    role.signatures.some((signature) => signature.mandatory),
  );
  const isStampSectionVisible =
    (areAdditionalStampsAllowed && !isSessionLocked) || stamps.length > 0;
  const isCheckmarkSectionVisible =
    (areAdditionalCheckboxesAllowed && !isSessionLocked) ||
    checkmarks.length > 0;

  useEffect(() => {
    if (!activeSignatureId) return;
    const activeRole = roles.find((role) =>
      role.signatures.some(
        (signature) => signature.signatureId === activeSignatureId,
      ),
    );
    if (!activeRole) return;
    setExpandedRoleIds((current) => {
      if (current.has(activeRole.roleId)) return current;
      return new Set(current).add(activeRole.roleId);
    });
  }, [activeSignatureId, roles]);

  function toggleRole(roleId: string) {
    setExpandedRoleIds((current) => {
      const next = new Set(current);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  return (
    <div
      className={
        variant === 'overlay'
          ? styles.sidebarOverlay
          : variant === 'accordion'
            ? styles.sidebarAccordion
            : styles.sidebar
      }
      data-field-id="sidebar"
    >
      {canStartWorkflow && (
        <button
          type="button"
          className={styles.startWorkflowButton}
          data-field-id="sidebar-start-workflow"
          disabled={isSessionLocked}
          onClick={onStartWorkflowClick}
        >
          {isSessionLocked
            ? t('global.signatureFlowInProgress')
            : t('global.startWorkflowButton')}
        </button>
      )}
      <span className={styles.title}>
        {t('signaturesSidebar.signaturesTitle')}
      </span>
      <div className={styles.roleList}>
        {roles.map((role) => {
          const isExpanded = expandedRoleIds.has(role.roleId);
          return (
            <div key={role.roleId} className={styles.roleGroup}>
              <button
                type="button"
                className={styles.roleHeader}
                data-field-id={`sidebar-role-${role.roleId}`}
                onClick={() => toggleRole(role.roleId)}
                aria-expanded={isExpanded}
              >
                <span className={styles.roleLabel}>{role.label}</span>
                <Icon
                  name="arrowDown"
                  className={
                    isExpanded ? styles.roleChevronExpanded : styles.roleChevron
                  }
                />
              </button>
              {isExpanded && (
                <ul className={styles.signatureList}>
                  {role.signatures.map((signature) => (
                    <li key={signature.signatureId}>
                      <button
                        type="button"
                        className={
                          signature.signatureId === activeSignatureId
                            ? styles.signatureButtonActive
                            : styles.signatureButton
                        }
                        data-field-id={`sidebar-signature-${signature.signatureId}`}
                        onClick={() => onSignatureClick(signature)}
                      >
                        <span className={styles.signatureText}>
                          {signature.text}
                        </span>
                        <span className={styles.signaturePage}>
                          ({t('global.page')} {signature.page})
                          {signature.mandatory ? ' *' : ''}
                        </span>
                        {signature.transacted && (
                          <Icon name="check" className={styles.signedIcon} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {hasMandatorySignature && (
        <div className={styles.mandatoryHint}>
          {t('signaturesSidebar.signaturesRequiredHint')}
        </div>
      )}
      {}
      {!isSessionLocked && areAdditionalSignaturesAllowed && (
        <button
          type="button"
          className={styles.addStampButton}
          data-field-id="sidebar-add-signature"
          disabled={isSignatureCreateDisabled}
          onClick={onAddSignatureClick}
        >
          <Icon name="plusCircle" className={styles.addStampIcon} />
          {t('signaturesSidebar.addNewSignatureButton')}
        </button>
      )}
      {canInviteNewUser && (
        <button
          type="button"
          className={styles.addStampButton}
          data-field-id="sidebar-invite"
          disabled={isSessionLocked}
          onClick={onInviteClick}
        >
          {t('signaturesSidebar.inviteNewUserButton')}
        </button>
      )}
      {}
      {batchSessions.length > 0 && (
        <div className={styles.roleGroup} data-field-id="sidebar-documents">
          <button
            type="button"
            className={styles.roleHeader}
            onClick={() => setIsDocumentsExpanded((current) => !current)}
            aria-expanded={isDocumentsExpanded}
          >
            <span className={styles.roleLabel}>
              {t('signaturesSidebar.documentsTitle')}
            </span>
            <Icon
              name="arrowDown"
              className={
                isDocumentsExpanded
                  ? styles.roleChevronExpanded
                  : styles.roleChevron
              }
            />
          </button>
          {isDocumentsExpanded && (
            <ul className={styles.signatureList}>
              {batchSessions.map((session) => (
                <li key={session.transactionId}>
                  <button
                    type="button"
                    className={
                      session.transactionId === activeTransactionId
                        ? styles.signatureButtonActive
                        : styles.signatureButton
                    }
                    data-field-id={`sidebar-document-${session.transactionId}`}
                    onClick={() => onDocumentClick(session)}
                  >
                    <span className={styles.signatureText}>
                      {session.fileName}
                    </span>
                    {session.areAllSignaturesCompleted && (
                      <Icon name="check" className={styles.signedIcon} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {isCheckmarkSectionVisible && (
        <>
          <span className={styles.title}>
            {t('signaturesSidebar.checkmarksTitle')}
          </span>
          {checkmarks.length > 0 && (
            <div className={styles.roleGroup}>
              <ul className={styles.signatureList}>
                {checkmarks.map((checkmark) => (
                  <li key={checkmark.checkboxId}>
                    <button
                      type="button"
                      className={
                        checkmark.checkboxId === activeCheckmarkId
                          ? styles.signatureButtonActive
                          : styles.signatureButton
                      }
                      data-field-id={`sidebar-checkmark-${checkmark.checkboxId}`}
                      onClick={() => onCheckmarkClick(checkmark)}
                    >
                      <span className={styles.signatureText}>
                        {checkmark.name ||
                          t('signaturesSidebar.unknownCheckmark')}
                      </span>
                      <span className={styles.signaturePage}>
                        ({t('global.page')} {checkmark.page})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!isSessionLocked && areAdditionalCheckboxesAllowed && (
            <button
              type="button"
              className={styles.addStampButton}
              data-field-id="sidebar-add-checkmark"
              disabled={isCheckmarkCreateDisabled}
              onClick={onAddCheckmarkClick}
            >
              <Icon name="plusCircle" className={styles.addStampIcon} />
              {t('signaturesSidebar.addNewIgv')}
            </button>
          )}
        </>
      )}
      {isStampSectionVisible && (
        <>
          <span className={styles.title}>
            {t('signaturesSidebar.stampsTitle')}
          </span>
          {stamps.length > 0 && (
            <div className={styles.roleGroup}>
              <ul className={styles.signatureList}>
                {stamps.map((stamp) => (
                  <li key={stamp.stampId}>
                    <button
                      type="button"
                      className={
                        stamp.stampId === activeStampId
                          ? styles.signatureButtonActive
                          : styles.signatureButton
                      }
                      data-field-id={`sidebar-stamp-${stamp.stampId}`}
                      onClick={() => onStampClick(stamp)}
                    >
                      <span className={styles.signatureText}>
                        {stamp.stampTemplateMetadata.defaultLabel ||
                          t('signaturesSidebar.unknownStamp')}
                      </span>
                      <span className={styles.signaturePage}>
                        ({t('global.page')} {stamp.page})
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!isSessionLocked && areAdditionalStampsAllowed && (
            <button
              type="button"
              className={styles.addStampButton}
              data-field-id="sidebar-add-stamp"
              disabled={isStampCreateDisabled}
              onClick={onAddStampClick}
            >
              <Icon name="plusCircle" className={styles.addStampIcon} />
              {t('signaturesSidebar.addNewStampButton')}
            </button>
          )}
        </>
      )}
      {showShortcutsButton && (
        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.shortcutsButton}
            data-field-id="sidebar-shortcuts"
            onClick={onShortcutsClick}
          >
            <Icon name="keyboard" className={styles.shortcutsIcon} />
            {t('signaturesSidebar.shortcutsButton')}
          </button>
        </div>
      )}
    </div>
  );
}
