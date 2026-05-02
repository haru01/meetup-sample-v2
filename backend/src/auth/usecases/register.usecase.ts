import { ok, err, type Result } from '@shared/result';
import { createAccount } from '../models/account';
import type { Account } from '../models/account';
import type { AccountRepository } from '../repositories/account.repository';
import type { PasswordHasher } from '../services/password-hasher';
import type { RegisterAccountError } from '../errors/auth-errors';
import type { AccountId } from '@shared/schemas/common';

// ============================================================
// アカウント登録ユースケース
// ============================================================

/**
 * アカウント登録コマンド
 */
export interface RegisterCommand {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly id: AccountId;
  readonly createdAt: Date;
}

/**
 * アカウント登録ユースケース
 *
 * 重複チェック、パスワードハッシュ化、アカウント生成・永続化を調整する。
 * ドメインロジックは createAccount() に委譲。
 */
export type RegisterUseCase = (
  command: RegisterCommand
) => Promise<Result<Account, RegisterAccountError>>;

export function createRegisterUseCase(
  accountRepository: AccountRepository,
  passwordHasher: PasswordHasher
): RegisterUseCase {
  return async (command) => {
    // メールアドレス重複チェック
    const existing = await accountRepository.findByEmail(command.email);
    if (existing) {
      return err({ type: 'DuplicateEmail', email: command.email });
    }

    // パスワードハッシュ化
    const passwordHash = await passwordHasher.hash(command.password);

    // アカウント生成（ファクトリに委譲）
    const accountResult = createAccount({
      id: command.id,
      name: command.name,
      email: command.email,
      passwordHash,
      createdAt: command.createdAt,
    });

    /* v8 ignore next 3 */
    if (!accountResult.ok) {
      return accountResult;
    }

    // 永続化
    await accountRepository.save(accountResult.value);

    return ok(accountResult.value);
  };
}
