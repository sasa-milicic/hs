import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon/Icon';
import { I18N_OPTIONS } from '../../../i18n/i18n';
import type { AppNotification } from '../../../types/notification';
import styles from './NotificationsContainer.module.css';

interface NotificationsContainerProps {
  notifications: AppNotification[];
  onDismiss: (notification: AppNotification) => void;
}

const AUTO_DISMISS_MS = 5000;

export function NotificationsContainer({
  notifications,
  onDismiss,
}: NotificationsContainerProps) {
  const { t } = useTranslation('translation', I18N_OPTIONS);
  const current = notifications[notifications.length - 1] ?? null;

  useEffect(() => {
    if (!current || current.type !== 'success') return;
    const timeout = setTimeout(() => onDismiss(current), AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;

  return (
    <div className={styles.container}>
      <div
        className={`${styles.notification} ${styles[current.type]}`}
        data-field-id="notification"
      >
        <span className={styles.message}>{t(current.messageKey)}</span>
        <button
          type="button"
          className={styles.dismissButton}
          data-field-id="notification-dismiss"
          onClick={() => onDismiss(current)}
          aria-label="Dismiss"
        >
          <Icon name="close" />
        </button>
      </div>
    </div>
  );
}
