import type { PrismaClient, NotificationType } from '@prisma/client';

// ============================================================
// Notification 書き込み専用リポジトリ（参加コンテキスト用）
// ============================================================

export interface NotificationRepository {
  create(type: NotificationType, recipientId: string, payload: string): Promise<void>;
}

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(type: NotificationType, recipientId: string, payload: string): Promise<void> {
    await this.prisma.notification.create({
      data: { type, recipientId, payload },
    });
  }
}
