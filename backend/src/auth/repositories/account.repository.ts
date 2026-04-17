import type { Account } from '../models/account';
import type { AccountId } from '@shared/schemas/common';

// ============================================================
// アカウントリポジトリ インターフェース
// ============================================================

/**
 * アカウントリポジトリインターフェース
 */
export interface AccountRepository {
  /**
   * メールアドレスでアカウントを取得
   */
  findByEmail(email: string): Promise<Account | null>;

  /**
   * IDでアカウントを取得
   */
  findById(id: AccountId): Promise<Account | null>;

  /**
   * アカウントを保存（新規作成または更新）
   */
  save(account: Account): Promise<void>;
}
