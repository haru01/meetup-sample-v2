import { ok, err, type Result } from '@shared/result';
import type { InMemoryEventBus } from '@shared/event-bus';
import { createEvent, type Event, type CreateEventInput } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type { CommunityRepository } from '@community/repositories/community.repository';
import type {
  CreateEventError,
  EventCreatedEvent,
  EventDomainEvent,
} from '../../errors/event-errors';

export type { CreateEventInput };

export type CreateEventCommand = (
  command: CreateEventInput
) => Promise<Result<Event, CreateEventError>>;

export function createCreateEventCommand(
  communityRepository: CommunityRepository,
  eventRepository: EventRepository,
  eventBus: InMemoryEventBus<EventDomainEvent>
): CreateEventCommand {
  return async (command) => {
    const community = await communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    const createResult = createEvent(command);
    if (!createResult.ok) return createResult;

    await eventRepository.save(createResult.value);

    const event: EventCreatedEvent = {
      type: 'EventCreated',
      eventId: createResult.value.id,
      communityId: createResult.value.communityId,
      createdBy: createResult.value.createdBy,
      title: createResult.value.title,
      occurredAt: command.createdAt,
    };
    await eventBus.publish(event);

    return ok(createResult.value);
  };
}
