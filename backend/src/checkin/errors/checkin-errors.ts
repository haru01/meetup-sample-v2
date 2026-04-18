import type { InvalidIdFormatError } from '@shared/errors';

// ============================================================
// CheckIn コンテキスト - エラー型定義
// ============================================================

export type CheckInAlreadyExistsError = { type: 'CheckInAlreadyExists' };
export type ParticipationNotApprovedError = { type: 'ParticipationNotApproved' };
export type ParticipationNotFoundError = { type: 'ParticipationNotFound' };
export type UnauthorizedError = { type: 'Unauthorized' };
export type CheckInNotFoundError = { type: 'CheckInNotFound' };

// ============================================================
// チェックイン実行エラー（Discriminated Union）
// ============================================================

export type CheckInError =
  | ParticipationNotFoundError
  | ParticipationNotApprovedError
  | CheckInAlreadyExistsError
  | UnauthorizedError
  | InvalidIdFormatError;

// ============================================================
// チェックイン一覧取得エラー
// ============================================================

export type ListCheckInsError = UnauthorizedError | InvalidIdFormatError;
