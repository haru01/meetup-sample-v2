import type { PrismaClient } from '@prisma/client';
import type { Event } from '../models/event';
import type { CommunityId, EventId, AccountId } from '@shared/schemas/common';
import type { EventRepository } from './event.repository';

// ============================================================
// Prisma を使用した EventRepository 実装
// ============================================================

type EventRecord = {
  id: string;
  communityId: string;
  createdBy: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  format: string;
  capacity: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaEventRepository implements EventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: Event): Promise<void> {
    await this.prisma.event.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        communityId: event.communityId,
        createdBy: event.createdBy,
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        format: event.format,
        capacity: event.capacity,
        status: event.status,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
      update: {
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        format: event.format,
        capacity: event.capacity,
        status: event.status,
        updatedAt: event.updatedAt,
      },
    });
  }

  async findById(id: EventId): Promise<Event | null> {
    const record = await this.prisma.event.findUnique({ where: { id } });
    return record ? this.toEvent(record) : null;
  }

  private toEvent(record: EventRecord): Event {
    return {
      id: record.id as EventId,
      communityId: record.communityId as CommunityId,
      createdBy: record.createdBy as AccountId,
      title: record.title,
      description: record.description,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      format: record.format as Event['format'],
      capacity: record.capacity,
      status: record.status as Event['status'],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
