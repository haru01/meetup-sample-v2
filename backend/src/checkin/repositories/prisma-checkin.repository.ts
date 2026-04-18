import type { PrismaClient } from '@prisma/client';
import type { AccountId, EventId } from '@shared/schemas/common';
import type { ParticipationId } from '@/participation/models/schemas/participation.schema';
import type { CheckIn, CheckInId } from '../models/checkin';
import type { CheckInRepository } from './checkin.repository';

// ============================================================
// Prisma を使用した CheckInRepository 実装
// ============================================================

type CheckInRecord = {
  id: string;
  participationId: string;
  eventId: string;
  accountId: string;
  checkedInAt: Date;
};

export class PrismaCheckInRepository implements CheckInRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByParticipationId(participationId: ParticipationId): Promise<CheckIn | null> {
    const record = await this.prisma.checkIn.findUnique({ where: { participationId } });
    return record ? this.toCheckIn(record) : null;
  }

  async findByEvent(eventId: EventId): Promise<CheckIn[]> {
    const records = await this.prisma.checkIn.findMany({
      where: { eventId },
      orderBy: { checkedInAt: 'asc' },
    });
    return records.map((record) => this.toCheckIn(record));
  }

  async save(checkin: CheckIn): Promise<void> {
    await this.prisma.checkIn.upsert({
      where: { id: checkin.id },
      create: {
        id: checkin.id,
        participationId: checkin.participationId,
        eventId: checkin.eventId,
        accountId: checkin.accountId,
        checkedInAt: checkin.checkedInAt,
      },
      update: {
        checkedInAt: checkin.checkedInAt,
      },
    });
  }

  private toCheckIn(record: CheckInRecord): CheckIn {
    return {
      id: record.id as CheckInId,
      participationId: record.participationId as ParticipationId,
      eventId: record.eventId as EventId,
      accountId: record.accountId as AccountId,
      checkedInAt: record.checkedInAt,
    };
  }
}
