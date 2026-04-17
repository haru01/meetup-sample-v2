import { err, type Result } from '@shared/result';
import type { EventId } from '@shared/schemas/common';
import type { Event } from '../../models/event';
import { updateEvent, type UpdateEventInput } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type { UpdateEventError } from '../../errors/event-errors';

// ============================================================
// イベント編集コマンド（DRAFT | PUBLISHED のみ編集可）
// ============================================================

export interface UpdateEventCommandInput {
  readonly eventId: string;
  readonly requesterId: string;
  readonly updates: UpdateEventInput;
}

export type UpdateEventCommand = (
  input: UpdateEventCommandInput
) => Promise<Result<Event, UpdateEventError>>;

export function createUpdateEventCommand(
  eventRepository: EventRepository
): UpdateEventCommand {
  return async ({ eventId, requesterId, updates }) => {
    const event = await eventRepository.findById(eventId as EventId);
    if (!event) return err({ type: 'EventNotFound' });
    if (event.createdBy !== requesterId) return err({ type: 'Unauthorized' });

    const result = updateEvent(event, updates);
    if (!result.ok) return result;

    await eventRepository.save(result.value);
    return result;
  };
}
