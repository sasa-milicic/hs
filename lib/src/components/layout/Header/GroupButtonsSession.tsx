import { Icon } from '../../shared/Icon/Icon';
import styles from './GroupButtonsSession.module.css';

interface GroupButtonsSessionProps {
  cancelLabel: string;
  finalizeLabel: string;
  signLabel: string;
  tempSaveLabel: string;
  isEverythingSigned: boolean;
  isSignButtonHidden: boolean;
  isRemoteSignatureSession: boolean;
  onCancel: () => void;
  onFinalize: () => void;
  onSignClick: () => void;
  onTempSaveClick: () => void;
}

export function GroupButtonsSession({
  cancelLabel,
  finalizeLabel,
  signLabel,
  tempSaveLabel,
  isEverythingSigned,
  isSignButtonHidden,
  isRemoteSignatureSession,
  onCancel,
  onFinalize,
  onSignClick,
  onTempSaveClick,
}: GroupButtonsSessionProps) {
  return (
    <div
      className={styles.sessionActions}
      data-field-id="header-session-actions"
    >
      <button
        type="button"
        className={styles.cancelButton}
        data-field-id="header-cancel"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>
      {!isSignButtonHidden && (
        <button
          type="button"
          className={styles.cancelButton}
          data-field-id="header-sign"
          onClick={onSignClick}
          disabled={isEverythingSigned}
        >
          {signLabel}
        </button>
      )}
      {isRemoteSignatureSession && (
        <button
          type="button"
          className={styles.finalizeButton}
          data-field-id="header-temp-save"
          onClick={onTempSaveClick}
        >
          {tempSaveLabel}
          <Icon name="save" />
        </button>
      )}
      <button
        type="button"
        className={styles.finalizeButton}
        data-field-id="header-finalize"
        onClick={onFinalize}
      >
        {finalizeLabel}
        <Icon name="save" />
      </button>
    </div>
  );
}
