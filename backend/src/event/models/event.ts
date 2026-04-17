import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';
import type {
  EventTitle,
  EventDescription,
  EventFormat,
  EventCapacity,
} from './schemas/event.schema';
import { EventStatus } from './schemas/event.schema';
import type {
  EventAlreadyPublishedError,
  EventNotEditableError,
  EventNotYetHeldError,
  EventAlreadyOccurredError,
} from '../errors/event-errors';

// ============================================================
// イベントエンティティ
// ============================================================

export interface Event {
  readonly id: EventId;
  readonly communityId: CommunityId;
  readonly createdBy: AccountId;
  readonly title: EventTitle;
  readonly description: EventDescription;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly format: EventFormat;
  readonly capacity: EventCapacity;
  readonly status: EventStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ============================================================
// 状態遷移: DRAFT → PUBLISHED
// ============================================================

export function publishEvent(event: Event): Result<Event, EventAlreadyPublishedError> {
  if (event.status !== EventStatus.DRAFT) {
    return err({ type: 'EventAlreadyPublished' });
  }
  return ok({ ...event, status: EventStatus.PUBLISHED, updatedAt: new Date() });
}

// ============================================================
// 編集: DRAFT | PUBLISHED のみ可
// ============================================================

export interface UpdateEventInput {
  readonly title?: EventTitle;
  readonly description?: EventDescription;
  readonly startsAt?: Date;
  readonly endsAt?: Date;
  readonly format?: EventFormat;
  readonly capacity?: EventCapacity;
}

export function updateEvent(
  event: Event,
  updates: UpdateEventInput
): Result<Event, EventNotEditableError> {
  if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.PUBLISHED) {
    return err({ type: 'EventNotEditable' });
  }
  return ok({
    ...event,
    title: updates.title ?? event.title,
    description: updates.description ?? event.description,
    startsAt: updates.startsAt ?? event.startsAt,
    endsAt: updates.endsAt ?? event.endsAt,
    format: updates.format ?? event.format,
    capacity: updates.capacity ?? event.capacity,
    updatedAt: new Date(),
  });
}

// ============================================================
// 状態遷移: PUBLISHED → CLOSED
// ============================================================

export function closeEvent(event: Event): Result<Event, EventNotYetHeldError> {
  if (event.status !== EventStatus.PUBLISHED) {
    return err({ type: 'EventNotYetHeld' });
  }
  return ok({ ...event, status: EventStatus.CLOSED, updatedAt: new Date() });
}

// ============================================================
// 状態遷移: PUBLISHED → CANCELLED
// ============================================================

export function cancelEvent(event: Event): Result<Event, EventAlreadyOccurredError> {
  if (event.status !== EventStatus.PUBLISHED) {
    return err({ type: 'EventAlreadyOccurred' });
  }
  return ok({ ...event, status: EventStatus.CANCELLED, updatedAt: new Date() });
}
