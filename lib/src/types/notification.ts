export type NotificationType = 'success' | 'error' | 'sessionExpired';

export interface AppNotification {
  id: string;
  messageKey: string;
  type: NotificationType;
}
