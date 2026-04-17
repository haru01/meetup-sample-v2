// ============================================================
// イベントコンテキスト - エラー型定義
// ============================================================

export type EventAlreadyPublishedError = { type: 'EventAlreadyPublished' };
export type EventNotEditableError = { type: 'EventNotEditable' };
export type EventNotFoundError = { type: 'EventNotFound' };
export type EventNotYetHeldError = { type: 'EventNotYetHeld' };
export type EventAlreadyOccurredError = { type: 'EventAlreadyOccurred' };
export type UnauthorizedError = { type: 'Unauthorized' };
export type CommunityNotFoundError = { type: 'CommunityNotFound' };
export type EventDateInPastError = { type: 'EventDateInPast' };
export type EventEndBeforeStartError = { type: 'EventEndBeforeStart' };

/** createEvent ファクトリが返すバリデーションエラー */
export type CreateEventValidationError = EventDateInPastError | EventEndBeforeStartError;

/** CreateEventCommand ユースケースが返すエラー */
export type CreateEventError = CommunityNotFoundError | CreateEventValidationError;

export type PublishEventError = EventNotFoundError | EventAlreadyPublishedError | UnauthorizedError;

export type UpdateEventError = EventNotFoundError | EventNotEditableError | UnauthorizedError;

export type CloseEventError = EventNotFoundError | EventNotYetHeldError | UnauthorizedError;

export type CancelEventError = EventNotFoundError | EventAlreadyOccurredError | UnauthorizedError;
