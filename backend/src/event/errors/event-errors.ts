// ============================================================
// イベントコンテキスト - エラー型定義
// ============================================================

export type CommunityNotFoundError = { type: 'CommunityNotFound' };
export type EventDateInPastError = { type: 'EventDateInPast' };
export type EventEndBeforeStartError = { type: 'EventEndBeforeStart' };

/** createEvent ファクトリが返すバリデーションエラー */
export type CreateEventValidationError = EventDateInPastError | EventEndBeforeStartError;

/** CreateEventCommand ユースケースが返すエラー */
export type CreateEventError = CommunityNotFoundError | CreateEventValidationError;
