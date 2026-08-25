import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import type { ViewportRect } from '../../../pdf/signatureRect';
import type { ISessionCheckmark } from '../../../types/session';
import styles from './CheckmarkField.module.css';

interface CheckmarkFieldProps {
  checkmark: ISessionCheckmark;
  isActive: boolean;
  isSessionLocked: boolean;
  rect: ViewportRect;
  onActivate: () => void;
  onSave: (
    checkmark: ISessionCheckmark,
    checked: boolean,
  ) => void | Promise<void>;
  onDelete: (checkmark: ISessionCheckmark) => void;
}

export function CheckmarkField({
  checkmark,
  isActive,
  isSessionLocked,
  rect,
  onActivate,
  onSave,
  onDelete,
}: CheckmarkFieldProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [currentChecked, setCurrentChecked] = useState(checkmark.checked);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCurrentChecked(checkmark.checked);
  }, [checkmark.checkboxId, checkmark.checked]);

  const showActions =
    checkmark.isCreatedInCurrentSession || currentChecked !== checkmark.checked;

  async function handleConfirm() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(checkmark, currentChecked);
    } catch (error) {
      console.error('Failed to save checkmark', error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    if (checkmark.isCreatedInCurrentSession) {
      onDelete(checkmark);
    } else {
      setCurrentChecked(checkmark.checked);
    }
  }

  let className = styles.field;
  if (isActive) className = `${className} ${styles.fieldActive}`;
  if (isSessionLocked) className = `${className} ${styles.disabled}`;

  return (
    <div
      className={className}
      data-field-id={checkmark.checkboxId}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      onClick={isSessionLocked ? undefined : onActivate}
    >
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={currentChecked}
        disabled={isSessionLocked || isSaving}
        onChange={(event) => setCurrentChecked(event.target.checked)}
        onClick={(event) => event.stopPropagation()}
      />
      {checkmark.label && (
        <span className={styles.label}>{checkmark.label}</span>
      )}
      {showActions && !isSessionLocked && (
        <div
          className={styles.actions}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleCancel}
            disabled={isSaving}
          >
            {t('checkmarkPlacer.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={isSaving}
          >
            {t('checkmarkPlacer.confirmButton')}
          </button>
        </div>
      )}
    </div>
  );
}
