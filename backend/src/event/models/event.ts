import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';
import type {
  EventTitle,
  EventDescription,
  EventFormat,
  EventCapacity,
  Event,
} from './schemas/event.schema';
import { EventStatus } from './schemas/event.schema';
import type { CreateEventValidationError } from '../errors/event-errors';

export type { Event } from './schemas/event.schema';
export { EventSchema } from './schemas/event.schema';

// ============================================================
// イベント作成（ファクトリ）
// ============================================================

export interface CreateEventInput {
  readonly id: EventId;
  readonly communityId: CommunityId;
  readonly createdBy: AccountId;
  readonly title: EventTitle;
  readonly description: EventDescription;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly format: EventFormat;
  readonly capacity: EventCapacity;
  readonly now: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function createEvent(input: CreateEventInput): Result<Event, CreateEventValidationError> {
  if (input.startsAt <= input.now) {
    return err({ type: 'EventDateInPast' });
  }
  if (input.endsAt <= input.startsAt) {
    return err({ type: 'EventEndBeforeStart' });
  }

  return ok({
    id: input.id,
    communityId: input.communityId,
    createdBy: input.createdBy,
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    format: input.format,
    capacity: input.capacity,
    status: EventStatus.DRAFT,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  });
}
