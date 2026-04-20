import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';

// ============================================================
// イベントコンテキスト - エラー型定義
// ============================================================

export type CommunityNotFoundError = { type: 'CommunityNotFound' };
export type EventDateInPastError = { type: 'EventDateInPast' };
export type EventEndBeforeStartError = { type: 'EventEndBeforeStart' };
export type EventNotFoundError = { type: 'EventNotFound' };
export type EventAlreadyPublishedError = { type: 'EventAlreadyPublished' };

/** createEvent ファクトリが返すバリデーションエラー */
export type CreateEventValidationError = EventDateInPastError | EventEndBeforeStartError;

/** CreateEventCommand ユースケースが返すエラー */
export type CreateEventError = CommunityNotFoundError | CreateEventValidationError;

/** publishEvent ドメイン関数が返す遷移バリデーションエラー */
export type PublishEventTransitionError = EventAlreadyPublishedError;

/** PublishEventCommand ユースケースが返すエラー */
export type PublishEventError = EventNotFoundError | PublishEventTransitionError;

/**
 * イベント作成ドメインイベント
 */
export type EventCreatedEvent = {
  type: 'EventCreated';
  eventId: EventId;
  communityId: CommunityId;
  createdBy: AccountId;
  title: string;
  occurredAt: Date;
};

/**
 * イベント公開ドメインイベント
 */
export type EventPublishedEvent = {
  type: 'EventPublished';
  eventId: EventId;
  communityId: CommunityId;
  publishedBy: AccountId;
  occurredAt: Date;
};

/** Event BC のドメインイベント union */
export type EventDomainEvent = EventCreatedEvent | EventPublishedEvent;
