import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDisplayClass } from '../../../layout/useDisplayClass';
import { Icon } from '../../shared/Icon/Icon';
import type { IconName } from '../../shared/Icon/icons';
import type { ViewportRect } from '../../../pdf/signatureRect';
import styles from './SignatureField.module.css';

export interface SignatureFieldMethod {
  key: string;
  label: string;
  icon: IconName;
  onSign: () => void;
  disabled?: boolean;
}

interface SignatureFieldProps {
  signatureId: string;
  text: string;
  isSigned: boolean;
  isActive: boolean;
  isSessionLocked: boolean;
  isCreatedInCurrentSession?: boolean;
  rect: ViewportRect;
  scale: number;
  methods: SignatureFieldMethod[];
  onActivate: () => void;
  onDelete?: () => void;
}

export function SignatureField({
  signatureId,
  text,
  isSigned,
  isActive,
  isSessionLocked,
  isCreatedInCurrentSession,
  rect,
  scale,
  methods,
  onActivate,
  onDelete,
}: SignatureFieldProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const { isMobile } = useDisplayClass();
  const [showDeleteControls, setShowDeleteControls] = useState(false);

  let className = isSigned ? styles.fieldSigned : styles.fieldUnsigned;
  if (isActive && isSigned) className = styles.fieldSignedActive;
  if (isSessionLocked) className = `${className} ${styles.disabled}`;

  function handleFieldClick() {
    onActivate();
    if (isCreatedInCurrentSession) setShowDeleteControls(true);
  }

  return (
    <div
      className={className}
      data-field-id={signatureId}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width / scale,
        height: rect.height / scale,
        transform: `scale(${scale})`,
        transformOrigin: 'left top',
      }}
      onClick={isSessionLocked ? undefined : handleFieldClick}
    >
      {!isSigned && methods.length > 0 && (
        <div className={styles.signMethods}>
          {methods.map((method) => (
            <button
              key={method.key}
              type="button"
              className={`${styles.signButton} ${isMobile ? styles.signButtonMobile : ''}`}
              title={method.label}
              disabled={isSessionLocked || method.disabled}
              onClick={(event) => {
                event.stopPropagation();
                method.onSign();
              }}
            >
              <Icon name={method.icon} className={styles.signButtonIcon} />
            </button>
          ))}
        </div>
      )}
      {!isSigned && text ? <span className={styles.label}>{text}</span> : null}
      {showDeleteControls && !isSigned && !isSessionLocked && (
        <div
          className={styles.actions}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => setShowDeleteControls(false)}
          >
            {t('signature.cancelButton')}
          </button>
          <button
            type="button"
            className={styles.deleteButton}
            onClick={onDelete}
          >
            {t('signature.deleteButton')}
          </button>
        </div>
      )}
    </div>
  );
}
