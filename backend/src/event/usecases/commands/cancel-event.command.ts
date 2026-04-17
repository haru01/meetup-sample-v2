import { err, type Result } from '@shared/result';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { EventId } from '@shared/schemas/common';
import type { Event } from '../../models/event';
import { cancelEvent } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type { CancelEventError } from '../../errors/event-errors';

// ============================================================
// イベント中止コマンド（PUBLISHED → CANCELLED）
// ============================================================

export interface CancelEventInput {
  readonly eventId: string;
  readonly requesterId: string;
}

export type CancelEventCommand = (
  input: CancelEventInput
) => Promise<Result<Event, CancelEventError>>;

export function createCancelEventCommand(
  eventRepository: EventRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): CancelEventCommand {
  return async ({ eventId, requesterId }) => {
    const event = await eventRepository.findById(eventId as EventId);
    if (!event) return err({ type: 'EventNotFound' });
    if (event.createdBy !== requesterId) return err({ type: 'Unauthorized' });

    const result = cancelEvent(event);
    if (!result.ok) return result;

    await eventRepository.save(result.value);
    await eventBus.publish({ type: 'EventCancelled', eventId: result.value.id });
    return result;
  };
}
