import { ok, type Result } from '@shared/result';
import type { AccountId } from '@shared/schemas/common';

// ============================================================
// アカウントエンティティ
// ============================================================

/** アカウントエンティティ（読み取り専用インターフェース） */
export interface Account {
  readonly id: AccountId;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: Date;
}

/** アカウント作成の入力 */
export interface CreateAccountInput {
  readonly id: AccountId;
  readonly name: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly createdAt: Date;
}

/**
 * アカウントを作成する（ファクトリ関数）
 *
 * @param input アカウント作成入力（パスワードはハッシュ済み）
 * @returns 作成されたアカウント
 */
export function createAccount(input: CreateAccountInput): Result<Account, never> {
  return ok({
    id: input.id,
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    createdAt: input.createdAt,
  });
}
