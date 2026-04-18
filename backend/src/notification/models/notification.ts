import type { NotificationId, NotificationType } from './schemas/notification.schema';

// ============================================================
// Notification エンティティ
// ============================================================

export type { NotificationId, NotificationType };

export interface Notification {
  readonly id: NotificationId;
  readonly type: NotificationType;
  readonly recipientId: string;
  readonly payload: string;
  readonly sentAt: Date;
}
