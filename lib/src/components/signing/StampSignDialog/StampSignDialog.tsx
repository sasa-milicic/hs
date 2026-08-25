import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { signStampSign } from '../../../api/stampSign';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import type { StampTemplate } from '../../../api/getDocument.types';
import type { ISessionSignature } from '../../../types/session';
import styles from './StampSignDialog.module.css';

interface StampSignDialogProps {
  signature: ISessionSignature;
  roleId: string;
  transactionId: string;
  apiToken: string;
  stampTemplates: StampTemplate[];
  onClose: () => void;
  onSigned: (transactionId?: string) => void | Promise<void>;
  onSignedSuccessfully: () => void;
}

export function StampSignDialog({
  signature,
  roleId,
  transactionId,
  apiToken,
  stampTemplates,
  onClose,
  onSigned,
  onSignedSuccessfully,
}: StampSignDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting || !selectedTemplateName) return;
    setIsSubmitting(true);
    try {
      await signStampSign({
        transactionId,
        roleId,
        stampTemplateName: selectedTemplateName,
        signature,
        apiToken,
      });
      onSignedSuccessfully();
      await onSigned(transactionId);
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-stamp-sign">
        <h2 className={styles.title}>{t('addNewStampDialog.title')}</h2>
        {isSubmitting ? (
          <div className={styles.loading}>{t('loadingMessage.pleaseWait')}</div>
        ) : (
          <>
            <label className={styles.selectLabel}>
              {t('addNewStampDialog.selectStampTemplateLabel')}
              <select
                className={styles.select}
                data-field-id="modal-stamp-sign-template-select"
                value={selectedTemplateName}
                onChange={(event) =>
                  setSelectedTemplateName(event.target.value)
                }
              >
                <option value="" disabled />
                {stampTemplates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.defaultLabel}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                data-field-id="modal-stamp-sign-cancel"
                onClick={onClose}
              >
                {t('addNewStampDialog.cancelButton')}
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                data-field-id="modal-stamp-sign-confirm"
                onClick={handleSubmit}
                disabled={!selectedTemplateName}
              >
                {t('addNewStampDialog.confirmButton')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
