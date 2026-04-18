import type { PrismaClient } from '@prisma/client';
import type { NotificationType } from '../models/schemas/notification.schema';
import type { NotificationRecord, NotificationRepository } from './notification.repository';

// ============================================================
// Prisma を使用した NotificationRepository 実装
// ============================================================

export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(type: NotificationType, recipientId: string, payload: string): Promise<void> {
    await this.prisma.notification.create({
      data: { type, recipientId, payload },
    });
  }

  async saveMany(records: NotificationRecord[]): Promise<void> {
    if (records.length === 0) return;
    await this.prisma.notification.createMany({
      data: records.map((r) => ({
        type: r.type,
        recipientId: r.recipientId,
        payload: r.payload,
      })),
    });
  }
}
