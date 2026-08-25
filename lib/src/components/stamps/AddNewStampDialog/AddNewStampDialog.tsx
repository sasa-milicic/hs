import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createStamp } from '../../../api/createStamp';
import { inchesToPoints } from '../../../pdf/stampRect';
import type { StampInProgress } from '../../../pdf/stampRect';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import type {
  StampTemplate,
  StampTemplateField,
} from '../../../api/getDocument.types';
import styles from './AddNewStampDialog.module.css';

interface AddNewStampDialogProps {
  stampTemplates: StampTemplate[];
  transactionId: string;
  apiToken: string;
  currentPage: number;
  onClose: () => void;
  onCreated: (stamp: StampInProgress) => void;
}

function formatDateForSubmit(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

function parseDateFromTemplate(ddmmyyyy: string): string {
  const [day, month, year] = ddmmyyyy.split('.');
  if (!day || !month || !year) return '';
  return `${year}-${month}-${day}`;
}

export function AddNewStampDialog({
  stampTemplates,
  transactionId,
  apiToken,
  currentPage,
  onClose,
  onCreated,
}: AddNewStampDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTemplate =
    stampTemplates.find((template) => template.name === selectedTemplateName) ??
    null;

  function handleSelectTemplate(name: string) {
    setSelectedTemplateName(name);
    const template = stampTemplates.find(
      (candidate) => candidate.name === name,
    );
    const initialValues: Record<string, string> = {};
    template?.inputsMetadata.forEach((field) => {
      const rawValue = field.inputData.value ?? '';
      initialValues[field.inputName] =
        field.inputData.type === 'date' && rawValue
          ? parseDateFromTemplate(rawValue)
          : rawValue;
    });
    setFieldValues(initialValues);
  }

  function updateField(name: string, value: string) {
    setFieldValues((current) => ({ ...current, [name]: value }));
  }

  function getFieldError(field: StampTemplateField): string | undefined {
    const value = fieldValues[field.inputName] ?? '';
    const { validations } = field.inputData;
    if (validations.required === 'true' && !value.trim()) {
      return t('addNewStampDialog.fieldRequiredMessage');
    }
    if (
      validations.maxLength &&
      value.length > parseInt(validations.maxLength, 10)
    ) {
      return (
        t('addNewStampDialog.fieldMaxLengthMessagePrefix') +
        validations.maxLength
      );
    }
    if (field.inputData.type === 'float' && validations.precision) {
      const decimals = value.includes('.') ? value.split('.')[1].length : 0;
      if (decimals > parseInt(validations.precision, 10)) {
        return (
          t('addNewStampDialog.fieldPrecissionMessagePrefix') +
          validations.precision
        );
      }
    }
    return undefined;
  }

  const isFormValid = useMemo(() => {
    if (!selectedTemplate) return false;
    return selectedTemplate.inputsMetadata.every(
      (field) => !getFieldError(field),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate, fieldValues]);

  useDialogShortcuts({ onClose, onSubmit: handleSubmit });

  async function handleSubmit() {
    if (isSubmitting || !selectedTemplate || !isFormValid) return;
    setIsSubmitting(true);
    try {
      const fieldData = selectedTemplate.inputsMetadata.map((field) => {
        const rawValue = fieldValues[field.inputName] ?? '';
        return {
          inputName: field.inputName,
          inputValue:
            field.inputData.type === 'date' && rawValue
              ? formatDateForSubmit(rawValue)
              : rawValue,
        };
      });
      const stampId = Date.now().toString();
      const width = inchesToPoints(selectedTemplate.width);
      const height = inchesToPoints(selectedTemplate.height);
      const response = await createStamp({
        transactionId,
        stampId,
        page: currentPage,
        templateName: selectedTemplate.name,
        defaultLabel: selectedTemplate.defaultLabel,
        width,
        height,
        isMultiPage: selectedTemplate.isMultiPage,
        fieldData,
        apiToken,
      });
      onCreated({
        id: stampId,
        page: currentPage,
        x: 0,
        y: 0,
        width,
        height,
        isMultiPage: selectedTemplate.isMultiPage,
        templateName: selectedTemplate.name,
        defaultLabel: selectedTemplate.defaultLabel,
        image: response.stampTemplateImageData,
        fieldData,
      });
      onClose();
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-add-stamp">
        <h2 className={styles.title}>{t('addNewStampDialog.title')}</h2>
        <label className={styles.selectLabel}>
          {t('addNewStampDialog.selectStampTemplateLabel')}
          <select
            className={styles.select}
            data-field-id="modal-add-stamp-template-select"
            value={selectedTemplateName}
            disabled={isSubmitting}
            onChange={(event) => handleSelectTemplate(event.target.value)}
          >
            <option value="" disabled />
            {stampTemplates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.defaultLabel}
              </option>
            ))}
          </select>
        </label>
        {selectedTemplate && (
          <div className={styles.fields}>
            {selectedTemplate.inputsMetadata
              .filter((field) => field.inputData.showInEditor)
              .map((field) => {
                const error = getFieldError(field);
                const value = fieldValues[field.inputName] ?? '';
                const isRequired =
                  field.inputData.validations.required === 'true';
                const isDisabled =
                  isSubmitting || field.inputData.editable === false;
                return (
                  <label key={field.inputName} className={styles.fieldLabel}>
                    <span className={styles.fieldLabelText}>
                      {field.inputData.description}
                      {isRequired ? ' *' : ''}
                    </span>
                    {field.inputData.type === 'multiline_text' ? (
                      <textarea
                        className={styles.textarea}
                        data-field-id={`modal-add-stamp-field-${field.inputName}`}
                        value={value}
                        disabled={isDisabled}
                        onChange={(event) =>
                          updateField(field.inputName, event.target.value)
                        }
                      />
                    ) : field.inputData.type === 'dropdown' ? (
                      <select
                        className={styles.select}
                        data-field-id={`modal-add-stamp-field-${field.inputName}`}
                        value={value}
                        disabled={isDisabled}
                        onChange={(event) =>
                          updateField(field.inputName, event.target.value)
                        }
                      >
                        <option value="" disabled />
                        {(field.inputData.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.inputData.type === 'date' ? (
                      <span className={styles.dateRow}>
                        <input
                          type="date"
                          className={styles.input}
                          data-field-id={`modal-add-stamp-field-${field.inputName}`}
                          value={value}
                          disabled={isDisabled}
                          onChange={(event) =>
                            updateField(field.inputName, event.target.value)
                          }
                        />
                        <span className={styles.hint}>
                          {t('addNewStampDialog.dateFormatHint')}
                        </span>
                      </span>
                    ) : (
                      <input
                        type={
                          field.inputData.type === 'float' ? 'number' : 'text'
                        }
                        className={styles.input}
                        data-field-id={`modal-add-stamp-field-${field.inputName}`}
                        value={value}
                        disabled={isDisabled}
                        onChange={(event) =>
                          updateField(field.inputName, event.target.value)
                        }
                      />
                    )}
                    {error && <span className={styles.error}>{error}</span>}
                  </label>
                );
              })}
          </div>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            data-field-id="modal-add-stamp-cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('addNewStampDialog.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.confirmButton}
            data-field-id="modal-add-stamp-confirm"
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
          >
            {t('addNewStampDialog.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
