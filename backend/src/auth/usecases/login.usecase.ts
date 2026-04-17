import { ok, err, type Result } from '@shared/result';
import type { AccountRepository } from '../repositories/account.repository';
import type { PasswordHasher } from '../services/password-hasher';
import type { TokenService } from '../services/token-service';
import type { LoginError } from '../errors/auth-errors';

// ============================================================
// ログインユースケース
// ============================================================

/**
 * ログインコマンド
 */
export interface LoginCommand {
  readonly email: string;
  readonly password: string;
}

/**
 * ログイン結果（トークンとアカウント情報）
 */
export interface LoginResult {
  readonly token: string;
  readonly account: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly createdAt: Date;
  };
}

/**
 * ログインユースケース
 *
 * メールアドレスとパスワードを検証し、JWTトークンを発行する。
 */
export type LoginUseCase = (command: LoginCommand) => Promise<Result<LoginResult, LoginError>>;

export function createLoginUseCase(
  accountRepository: AccountRepository,
  passwordHasher: PasswordHasher,
  tokenService: TokenService
): LoginUseCase {
  return async (command) => {
    // メールアドレスでアカウント検索
    const account = await accountRepository.findByEmail(command.email);
    if (!account) {
      return err({ type: 'InvalidCredentials' });
    }

    // パスワード検証
    const isValid = await passwordHasher.verify(command.password, account.passwordHash);
    if (!isValid) {
      return err({ type: 'InvalidCredentials' });
    }

    // JWTトークン生成
    const token = tokenService.generate({ accountId: account.id });

    return ok({
      token,
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        createdAt: account.createdAt,
      },
    });
  };
}
