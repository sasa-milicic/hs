import { useTranslation } from 'react-i18next';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import { useDialogShortcuts } from '../../../hooks/useDialogShortcuts';
import styles from './ShortcutsDialog.module.css';

interface ShortcutsDialogProps {
  onClose: () => void;
}

const SHORTCUT_ROWS: Array<{ shortcut: string; description: string }> = [
  { shortcut: 'finalizeShortcut', description: 'finalize' },
  { shortcut: 'cancelCloseShortcut', description: 'cancelClose' },
  { shortcut: 'nextPageShortcut', description: 'previousPage' },
  { shortcut: 'previousPageShortcut', description: 'nextPage' },
  { shortcut: 'nextSignatureShortcut', description: 'nextSignature' },
  { shortcut: 'previousSignatureShortcut', description: 'previousSignature' },
  {
    shortcut: 'displayManualSignatureDialogShortcut',
    description: 'displayManualSignatureDialog',
  },
  {
    shortcut: 'displayQualifiedSIgnatureDialogShotcut',
    description: 'displayQualifiedSIgnatureDialog',
  },
  { shortcut: 'sidebarsToggleShortcut', description: 'sidebarsToggle' },
  { shortcut: 'zoomInShortcut', description: 'zoomIn' },
  { shortcut: 'zoomOutShortcut', description: 'zoomOut' },
  { shortcut: 'fullHeightShortcut', description: 'fullHeight' },
  {
    shortcut: 'clearManualSignatureDialogShortcut',
    description: 'clearManualSignatureDialog',
  },
  { shortcut: 'acceptSignatureShortcut', description: 'acceptSignature' },
  {
    shortcut: 'closeSignatureDialogShortcut',
    description: 'closeSignatureDialog',
  },
  { shortcut: 'closeDialogShortcut', description: 'closeDialog' },
  { shortcut: 'acceptDialogShortcut', description: 'acceptDialog' },
];

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  useDialogShortcuts({ onClose, onSubmit: onClose });

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog} data-field-id="modal-shortcuts">
        <h2 className={styles.title}>{t('shortcuts.dialogTitle')}</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('shortcuts.shortcuts')}</th>
                <th>{t('shortcuts.description')}</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUT_ROWS.map((row) => (
                <tr key={row.shortcut}>
                  <td>{t(`shortcuts.${row.shortcut}`)}</td>
                  <td>{t(`shortcuts.${row.description}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            data-field-id="modal-shortcuts-close"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
