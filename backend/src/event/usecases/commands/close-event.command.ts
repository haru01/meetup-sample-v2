import { err, type Result } from '@shared/result';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { EventId } from '@shared/schemas/common';
import type { Event } from '../../models/event';
import { closeEvent } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type { CloseEventError } from '../../errors/event-errors';

// ============================================================
// イベントクローズコマンド（PUBLISHED → CLOSED）
// ============================================================

export interface CloseEventInput {
  readonly eventId: string;
  readonly requesterId: string;
}

export type CloseEventCommand = (
  input: CloseEventInput
) => Promise<Result<Event, CloseEventError>>;

export function createCloseEventCommand(
  eventRepository: EventRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): CloseEventCommand {
  return async ({ eventId, requesterId }) => {
    const event = await eventRepository.findById(eventId as EventId);
    if (!event) return err({ type: 'EventNotFound' });
    if (event.createdBy !== requesterId) return err({ type: 'Unauthorized' });

    const result = closeEvent(event);
    if (!result.ok) return result;

    await eventRepository.save(result.value);
    await eventBus.publish({ type: 'EventClosed', eventId: result.value.id });
    return result;
  };
}
