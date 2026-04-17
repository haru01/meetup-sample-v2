import { ok, err, type Result } from '@shared/result';
import type { Event } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type { EventId } from '@shared/schemas/common';

export type GetEventError = { type: 'EventNotFound' };

export type GetEventQuery = (id: string) => Promise<Result<Event, GetEventError>>;

export function createGetEventQuery(eventRepository: EventRepository): GetEventQuery {
  return async (id) => {
    const event = await eventRepository.findById(id as EventId);
    if (!event) return err({ type: 'EventNotFound' });
    return ok(event);
  };
}
