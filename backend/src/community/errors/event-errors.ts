// ============================================================
// イベントコンテキスト - エラー型定義
// ============================================================

/**
 * イベント作成エラー（Discriminated Union）
 */
export type CreateEventError =
  | { type: 'CommunityNotFound' }
  | { type: 'EventDateInPast' }
  | { type: 'EventEndBeforeStart' };
