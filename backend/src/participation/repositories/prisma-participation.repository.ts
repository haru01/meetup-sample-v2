import type { PrismaClient, Prisma } from '@prisma/client';
import { ParticipationStatus as PrismaParticipationStatus } from '@prisma/client';
import {
  waitlistParticipation,
  type Participation,
  type ParticipationId,
} from '../models/participation';
import type { ParticipationStatus } from '../models/schemas/participation.schema';
import type { ParticipationRepository } from './participation.repository';

// ============================================================
// Prisma を使用した ParticipationRepository 実装
// ============================================================

type ParticipationRecord = {
  id: string;
  eventId: string;
  accountId: string;
  status: PrismaParticipationStatus;
  appliedAt: Date;
  updatedAt: Date;
};

export class PrismaParticipationRepository implements ParticipationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: ParticipationId): Promise<Participation | null> {
    const record = await this.prisma.participation.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findByEventAndAccount(eventId: string, accountId: string): Promise<Participation | null> {
    const record = await this.prisma.participation.findUnique({
      where: { eventId_accountId: { eventId, accountId } },
    });
    return record ? this.toEntity(record) : null;
  }

  async findAppliedByEvent(eventId: string): Promise<Participation[]> {
    const records = await this.prisma.participation.findMany({
      where: { eventId, status: PrismaParticipationStatus.APPLIED },
      orderBy: { appliedAt: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findApprovedByEvent(eventId: string): Promise<Participation[]> {
    const records = await this.prisma.participation.findMany({
      where: { eventId, status: PrismaParticipationStatus.APPROVED },
      orderBy: { appliedAt: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findActiveByEvent(eventId: string): Promise<Participation[]> {
    const records = await this.prisma.participation.findMany({
      where: {
        eventId,
        status: {
          in: [PrismaParticipationStatus.APPROVED, PrismaParticipationStatus.WAITLISTED],
        },
      },
      orderBy: { appliedAt: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async countApproved(eventId: string): Promise<number> {
    return this.prisma.participation.count({
      where: { eventId, status: PrismaParticipationStatus.APPROVED },
    });
  }

  async findFirstWaitlisted(eventId: string): Promise<Participation | null> {
    const record = await this.prisma.participation.findFirst({
      where: { eventId, status: PrismaParticipationStatus.WAITLISTED },
      orderBy: { appliedAt: 'asc' },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByAccount(accountId: string): Promise<Participation[]> {
    const records = await this.prisma.participation.findMany({
      where: { accountId },
      orderBy: { appliedAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async save(participation: Participation): Promise<void> {
    await this.prisma.participation.upsert({
      where: { id: participation.id },
      create: {
        id: participation.id,
        eventId: participation.eventId,
        accountId: participation.accountId,
        status: participation.status as PrismaParticipationStatus,
        appliedAt: participation.appliedAt,
        updatedAt: participation.updatedAt,
      },
      update: {
        status: participation.status as PrismaParticipationStatus,
        updatedAt: participation.updatedAt,
      },
    });
  }

  async saveAll(participations: Participation[]): Promise<void> {
    await this.prisma.$transaction(
      participations.map((p) =>
        this.prisma.participation.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            eventId: p.eventId,
            accountId: p.accountId,
            status: p.status as PrismaParticipationStatus,
            appliedAt: p.appliedAt,
            updatedAt: p.updatedAt,
          },
          update: {
            status: p.status as PrismaParticipationStatus,
            updatedAt: p.updatedAt,
          },
        })
      )
    );
  }

  /**
   * AutoWaitlistIfFull ポリシー: initial を保存し、定員を超えていれば WAITLISTED に更新する。
   * トランザクション境界は本メソッド内部に閉じる。
   */
  async applyWithCapacityCheck(initial: Participation, capacity: number): Promise<Participation> {
    return this.prisma.$transaction(async (tx) => {
      await this.upsertWithTx(tx, initial);
      const approvedCount = await tx.participation.count({
        where: { eventId: initial.eventId, status: PrismaParticipationStatus.APPROVED },
      });
      if (approvedCount < capacity) {
        return initial;
      }
      const waitlisted = waitlistParticipation(initial);
      if (!waitlisted.ok) {
        return initial;
      }
      await this.upsertWithTx(tx, waitlisted.value);
      return waitlisted.value;
    });
  }

  private async upsertWithTx(
    tx: Prisma.TransactionClient,
    participation: Participation
  ): Promise<void> {
    await tx.participation.upsert({
      where: { id: participation.id },
      create: {
        id: participation.id,
        eventId: participation.eventId,
        accountId: participation.accountId,
        status: participation.status as PrismaParticipationStatus,
        appliedAt: participation.appliedAt,
        updatedAt: participation.updatedAt,
      },
      update: {
        status: participation.status as PrismaParticipationStatus,
        updatedAt: participation.updatedAt,
      },
    });
  }

  private toEntity(record: ParticipationRecord): Participation {
    return {
      id: record.id as ParticipationId,
      eventId: record.eventId,
      accountId: record.accountId,
      status: record.status as ParticipationStatus,
      appliedAt: record.appliedAt,
      updatedAt: record.updatedAt,
    };
  }
}
