import type { PrismaClient } from '@prisma/client';
import { EventStatus } from '@prisma/client';
import { ok, err, type Result } from '@shared/result';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import {
  createParticipationId,
  waitlistParticipation,
  type Participation,
} from '../../models/participation';
import { ParticipationStatus } from '../../models/schemas/participation.schema';
import type { PrismaParticipationRepository } from '../../repositories/prisma-participation.repository';
import type { ApplyForEventError } from '../../errors/participation-errors';

// ============================================================
// イベント参加申込コマンド
// ============================================================

export interface ApplyForEventInput {
  readonly eventId: string;
  readonly accountId: string;
}

export type ApplyForEventCommand = (
  command: ApplyForEventInput
) => Promise<Result<Participation, ApplyForEventError>>;

/**
 * イベント参加申込ユースケース
 *
 * Event が PUBLISHED であることを確認し、同一アカウントの既存申込がなければ
 * APPLIED で保存する。SAME TX 内で定員チェックを行い、既に定員充足なら
 * その場で WAITLISTED に更新する（AutoWaitlistIfFull）。
 */
export function createApplyForEventCommand(
  prisma: PrismaClient,
  participationRepository: PrismaParticipationRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): ApplyForEventCommand {
  return async (command) => {
    const event = await prisma.event.findUnique({
      where: { id: command.eventId },
      select: { id: true, status: true, capacity: true },
    });
    if (!event) {
      return err({ type: 'EventNotFound' });
    }
    if (event.status !== EventStatus.PUBLISHED) {
      return err({ type: 'EventNotPublished' });
    }

    const existing = await participationRepository.findByEventAndAccount(
      command.eventId,
      command.accountId
    );
    if (existing) {
      return err({ type: 'AlreadyApplied' });
    }

    const now = new Date();
    const initial: Participation = {
      id: createParticipationId(),
      eventId: command.eventId,
      accountId: command.accountId,
      status: ParticipationStatus.APPLIED,
      appliedAt: now,
      updatedAt: now,
    };

    const saved = await prisma.$transaction(async (tx) => {
      await participationRepository.saveWithTx(tx, initial);
      const approvedCount = await participationRepository.countApprovedWithTx(
        tx,
        command.eventId
      );
      if (approvedCount >= event.capacity) {
        const waitlistedResult = waitlistParticipation(initial);
        if (!waitlistedResult.ok) {
          return initial;
        }
        await participationRepository.saveWithTx(tx, waitlistedResult.value);
        return waitlistedResult.value;
      }
      return initial;
    });

    await eventBus.publish({
      type: 'ParticipationApplied',
      participationId: saved.id,
      eventId: saved.eventId,
      accountId: saved.accountId,
    });

    return ok(saved);
  };
}
