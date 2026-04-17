// ============================================================
// 認証コンテキスト - エラー型定義
// ============================================================

/**
 * アカウント登録エラー（Discriminated Union）
 * @remarks ユースケースで使用
 */
export type RegisterAccountError = { type: 'DuplicateEmail'; email: string };

/**
 * ログインエラー（Discriminated Union）
 * @remarks ユースケースで使用
 */
export type LoginError = { type: 'InvalidCredentials' };
