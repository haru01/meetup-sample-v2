import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';
import type {
  EventTitle,
  EventDescription,
  EventFormat,
  EventCapacity,
} from './schemas/event.schema';
import { EventStatus } from './schemas/event.schema';

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
// イベント作成
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

export type CreateEventValidationError =
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };

/**
 * イベントを作成する（ファクトリ関数）
 *
 * 日時のバリデーションを行い、DRAFT 状態のイベントを生成する。
 *
 * @param input イベント作成入力
 * @returns イベント、またはバリデーションエラー
 */
export function createEvent(input: CreateEventInput): Result<Event, CreateEventValidationError> {
  if (input.startsAt <= input.now) {
    return err({ type: 'EventDateInPast' });
  }
  if (input.endsAt <= input.startsAt) {
    return err({ type: 'EventEndBeforeStart' });
  }

  const event: Event = {
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
  };

  return ok(event);
}
