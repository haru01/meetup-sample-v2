import { ok, err, type Result } from '@shared/result';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import {
  cancelParticipation,
  type Participation,
  type ParticipationId,
} from '../../models/participation';
import type { ParticipationRepository } from '../../repositories/participation.repository';
import type { CancelParticipationError } from '../../errors/participation-errors';

// ============================================================
// 参加キャンセルコマンド
// ============================================================

export interface CancelParticipationInput {
  readonly participationId: ParticipationId;
  readonly requesterId: string;
}

export type CancelParticipationCommand = (
  command: CancelParticipationInput
) => Promise<Result<Participation, CancelParticipationError>>;

/**
 * 参加キャンセルユースケース
 *
 * 本人のみ実行可。APPLIED | APPROVED → CANCELLED に遷移し、
 * ParticipationCancelled を publish する（キャンセル待ち昇格や主催者通知の契機）。
 */
export function createCancelParticipationCommand(
  participationRepository: ParticipationRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): CancelParticipationCommand {
  return async (command) => {
    const participation = await participationRepository.findById(command.participationId);
    if (!participation) {
      return err({ type: 'ParticipationNotFound' });
    }
    if (participation.accountId !== command.requesterId) {
      return err({ type: 'Unauthorized' });
    }

    const cancelled = cancelParticipation(participation);
    if (!cancelled.ok) {
      return cancelled;
    }

    await participationRepository.save(cancelled.value);

    await eventBus.publish({
      type: 'ParticipationCancelled',
      participationId: cancelled.value.id,
      eventId: cancelled.value.eventId,
    });

    return ok(cancelled.value);
  };
}
