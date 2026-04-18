import { z } from 'zod';

// ============================================================
// アカウント登録入力スキーマ
// ============================================================

/**
 * 登録名スキーマ（1〜100文字）
 */
export const RegisterNameSchema = z.string().min(1).max(100);

/**
 * 登録メールアドレススキーマ（有効なメール形式）
 */
export const RegisterEmailSchema = z.string().email();

/**
 * 登録パスワードスキーマ（1文字以上）
 */
export const RegisterPasswordSchema = z.string().min(1);

/**
 * アカウント登録入力スキーマ
 */
export const RegisterAccountInputSchema = z.object({
  name: RegisterNameSchema,
  email: RegisterEmailSchema,
  password: RegisterPasswordSchema,
});

/** アカウント登録入力型（スキーマから導出） */
export type RegisterAccountInput = z.infer<typeof RegisterAccountInputSchema>;
