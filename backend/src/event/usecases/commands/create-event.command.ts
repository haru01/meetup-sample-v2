import { ok, err, type Result } from '@shared/result';
import { createEvent, type Event, type CreateEventInput } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type { CommunityRepository } from '@community/repositories/community.repository';
import type { CreateEventError } from '../../errors/event-errors';

export type { CreateEventInput };

export type CreateEventCommand = (
  command: CreateEventInput
) => Promise<Result<Event, CreateEventError>>;

export function createCreateEventCommand(
  communityRepository: CommunityRepository,
  eventRepository: EventRepository
): CreateEventCommand {
  return async (command) => {
    const community = await communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    const createResult = createEvent(command);
    if (!createResult.ok) return createResult;

    await eventRepository.save(createResult.value);
    return ok(createResult.value);
  };
}
