import { ok, err, type Result } from '@shared/result';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { InvalidIdFormatError } from '@shared/errors';
import { parseAccountId, parseEventId } from '@shared/schemas/id-factories';
import type { AccountId, EventId } from '@shared/schemas/common';
import type { EventRepository } from '@event/repositories/event.repository';
import {
  approveParticipation,
  type Participation,
  type ParticipationId,
} from '../../models/participation';
import type { ParticipationRepository } from '../../repositories/participation.repository';
import type { ApproveParticipationsError } from '../../errors/participation-errors';

function parseApproveIds(
  command: ApproveParticipationsInput
): Result<{ eventId: EventId; requesterId: AccountId }, InvalidIdFormatError> {
  const parsedEventId = parseEventId(command.eventId, 'eventId');
  if (!parsedEventId.ok) return parsedEventId;
  const parsedRequesterId = parseAccountId(command.requesterId, 'requesterId');
  if (!parsedRequesterId.ok) return parsedRequesterId;
  return ok({ eventId: parsedEventId.value, requesterId: parsedRequesterId.value });
}

// ============================================================
// 参加申込承認（BULK）コマンド
// ============================================================

export interface ApproveParticipationsInput {
  readonly eventId: string;
  readonly requesterId: string;
  readonly participationIds?: ParticipationId[];
}

export type ApproveParticipationsCommand = (
  command: ApproveParticipationsInput
) => Promise<Result<Participation[], ApproveParticipationsError>>;

/**
 * 参加申込一括承認ユースケース
 *
 * participationIds 未指定時はイベントの全 APPLIED を承認する。
 * 主催者（event.createdBy）のみ実行可。
 */
export function createApproveParticipationsCommand(
  eventRepository: EventRepository,
  participationRepository: ParticipationRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): ApproveParticipationsCommand {
  return async (command) => {
    const parsed = parseApproveIds(command);
    if (!parsed.ok) return parsed;
    const { eventId, requesterId } = parsed.value;

    const event = await eventRepository.findById(eventId);
    if (!event) {
      return err({ type: 'EventNotFound' });
    }
    if (event.createdBy !== requesterId) {
      return err({ type: 'Unauthorized' });
    }

    const targets: Participation[] = [];
    if (command.participationIds && command.participationIds.length > 0) {
      for (const id of command.participationIds) {
        const p = await participationRepository.findById(id);
        if (!p || p.eventId !== eventId) {
          return err({ type: 'ParticipationNotFound' });
        }
        targets.push(p);
      }
    } else {
      const applied = await participationRepository.findAppliedByEvent(eventId);
      targets.push(...applied);
    }

    const approved: Participation[] = [];
    for (const p of targets) {
      const result = approveParticipation(p);
      if (!result.ok) {
        return result;
      }
      approved.push(result.value);
    }

    await participationRepository.saveAll(approved);

    for (const p of approved) {
      await eventBus.publish({
        type: 'ParticipationApproved',
        participationId: p.id,
        eventId: p.eventId,
        accountId: p.accountId,
      });
    }

    return ok(approved);
  };
}
