import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  title: string;
  messageLines: string[];
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  tertiaryLabel?: string;
  onTertiary?: () => void;
}

export function ConfirmDialog({
  title,
  messageLines,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  tertiaryLabel,
  onTertiary,
}: ConfirmDialogProps) {
  useDialogShortcuts({ onClose: onCancel, onSubmit: onConfirm });

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-confirm">
        <h2 className={styles.title}>{title}</h2>
        {messageLines.map((line) => (
          <p key={line} className={styles.message}>
            {line}
          </p>
        ))}
        <div
          className={
            tertiaryLabel ? styles.actionsWithTertiary : styles.actions
          }
        >
          {tertiaryLabel && (
            <button
              type="button"
              className={styles.tertiaryButton}
              data-field-id="modal-confirm-tertiary"
              onClick={onTertiary}
            >
              {tertiaryLabel}
            </button>
          )}
          {}
          {tertiaryLabel ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                data-field-id="modal-confirm-cancel"
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                data-field-id="modal-confirm-confirm"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={styles.cancelButton}
                data-field-id="modal-confirm-cancel"
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={styles.confirmButton}
                data-field-id="modal-confirm-confirm"
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
