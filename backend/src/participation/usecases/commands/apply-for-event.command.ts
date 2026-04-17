import { ok, err, type Result } from '@shared/result';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { EventId } from '@shared/schemas/common';
import type { EventRepository } from '@event/repositories/event.repository';
import { EventStatus } from '@event/models/schemas/event.schema';
import { createParticipationId, type Participation } from '../../models/participation';
import { ParticipationStatus } from '../../models/schemas/participation.schema';
import type { ParticipationRepository } from '../../repositories/participation.repository';
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
 * APPLIED で保存する。定員充足済みなら同一トランザクションで WAITLISTED に
 * 更新する（AutoWaitlistIfFull）。トランザクション境界は Repository に閉じる。
 */
export function createApplyForEventCommand(
  eventRepository: EventRepository,
  participationRepository: ParticipationRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): ApplyForEventCommand {
  return async (command) => {
    const event = await eventRepository.findById(command.eventId as EventId);
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

    const saved = await participationRepository.applyWithCapacityCheck(initial, event.capacity);

    await eventBus.publish({
      type: 'ParticipationApplied',
      participationId: saved.id,
      eventId: saved.eventId,
      accountId: saved.accountId,
    });

    return ok(saved);
  };
}
