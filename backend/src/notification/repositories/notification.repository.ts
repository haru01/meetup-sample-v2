import type { NotificationType } from '../models/schemas/notification.schema';

// ============================================================
// Notification リポジトリインターフェース
// ============================================================

export interface NotificationRecord {
  readonly type: NotificationType;
  readonly recipientId: string;
  readonly payload: string;
}

export interface NotificationRepository {
  create(type: NotificationType, recipientId: string, payload: string): Promise<void>;
  saveMany(records: NotificationRecord[]): Promise<void>;
}
