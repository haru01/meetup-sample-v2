import type { PrismaClient, NotificationType } from '@prisma/client';

// ============================================================
// Notification Repository — イベントコンテキストのポリシー用
// ============================================================

export interface NotificationRecord {
  readonly type: NotificationType;
  readonly recipientId: string;
  readonly payload: string;
}

export interface NotificationRepository {
  saveMany(notifications: NotificationRecord[]): Promise<void>;
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async saveMany(notifications: NotificationRecord[]): Promise<void> {
    if (notifications.length === 0) return;
    await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        type: n.type,
        recipientId: n.recipientId,
        payload: n.payload,
      })),
    });
  }
}
