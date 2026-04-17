// ============================================================
// 参加コンテキスト - エラー型定義
// ============================================================

export type ParticipationNotFoundError = { type: 'ParticipationNotFound' };
export type ParticipationInvalidStatusError = {
  type: 'ParticipationInvalidStatus';
  current: string;
};
export type EventNotPublishedError = { type: 'EventNotPublished' };
export type AlreadyAppliedError = { type: 'AlreadyApplied' };
export type EventNotFoundError = { type: 'EventNotFound' };
export type UnauthorizedError = { type: 'Unauthorized' };

// ============================================================
// ユースケース別エラー（Discriminated Union）
// ============================================================

export type ApplyForEventError =
  | EventNotFoundError
  | EventNotPublishedError
  | AlreadyAppliedError;

export type ApproveParticipationsError =
  | EventNotFoundError
  | UnauthorizedError
  | ParticipationNotFoundError
  | ParticipationInvalidStatusError;

export type CancelParticipationError =
  | ParticipationNotFoundError
  | UnauthorizedError
  | ParticipationInvalidStatusError;

export type GetApplicationListError = EventNotFoundError | UnauthorizedError;

export type GetRemainingCapacityError = EventNotFoundError;
