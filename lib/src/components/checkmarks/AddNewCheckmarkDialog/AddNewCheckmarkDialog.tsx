import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createCheckmarkInProgress } from '../../../pdf/checkmarkRect';
import type { CheckmarkInProgress } from '../../../pdf/checkmarkRect';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import styles from './AddNewCheckmarkDialog.module.css';

interface AddNewCheckmarkDialogProps {
  currentPage: number;
  onClose: () => void;
  onCreated: (checkmark: CheckmarkInProgress) => void;
}

export function AddNewCheckmarkDialog({
  currentPage,
  onClose,
  onCreated,
}: AddNewCheckmarkDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');

  useDialogShortcuts({ onClose, onSubmit: handleSubmit });

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onCreated(
      createCheckmarkInProgress(currentPage, trimmedName, label.trim()),
    );
    onClose();
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-add-checkmark">
        <h2 className={styles.title}>{t('addNewIgvSignatureDialog.title')}</h2>
        <label className={styles.fieldLabel}>
          <input
            type="text"
            className={styles.input}
            data-field-id="modal-add-checkmark-name"
            value={name}
            placeholder={t('addNewIgvSignatureDialog.namePlaceholder')}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className={styles.fieldLabel}>
          <input
            type="text"
            className={styles.input}
            data-field-id="modal-add-checkmark-label"
            value={label}
            placeholder={t('addNewIgvSignatureDialog.labelPlaceholder')}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            data-field-id="modal-add-checkmark-cancel"
            onClick={onClose}
          >
            {t('addNewIgvSignatureDialog.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            data-field-id="modal-add-checkmark-confirm"
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {t('addNewIgvSignatureDialog.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
