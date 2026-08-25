import { useState } from 'react';
import type {
  AppNotification,
  NotificationType,
} from '../../types/notification';

export interface UseNotificationsResult {
  notifications: AppNotification[];
  showNotification: (messageKey: string, type: NotificationType) => void;
  dismissNotification: (notification: AppNotification) => void;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  function showNotification(messageKey: string, type: NotificationType) {
    setNotifications((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random()}`, messageKey, type },
    ]);
  }

  function dismissNotification(notification: AppNotification) {
    setNotifications((current) =>
      current.filter((n) => n.id !== notification.id),
    );
  }

  return { notifications, showNotification, dismissNotification };
}
