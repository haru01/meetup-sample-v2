import { err, type Result } from '@shared/result';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { EventId } from '@shared/schemas/common';
import type { Event } from '../../models/event';
import { publishEvent } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type { PublishEventError } from '../../errors/event-errors';

// ============================================================
// イベント公開コマンド（DRAFT → PUBLISHED）
// ============================================================

export interface PublishEventInput {
  readonly eventId: string;
  readonly requesterId: string;
}

export type PublishEventCommand = (
  input: PublishEventInput
) => Promise<Result<Event, PublishEventError>>;

export function createPublishEventCommand(
  eventRepository: EventRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): PublishEventCommand {
  return async ({ eventId, requesterId }) => {
    const event = await eventRepository.findById(eventId as EventId);
    if (!event) return err({ type: 'EventNotFound' });
    if (event.createdBy !== requesterId) return err({ type: 'Unauthorized' });

    const result = publishEvent(event);
    if (!result.ok) return result;

    await eventRepository.save(result.value);
    await eventBus.publish({ type: 'EventPublished', eventId: result.value.id });
    return result;
  };
}
