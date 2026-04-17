import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLoginUseCase } from '../login.usecase';
import type { AccountRepository } from '../../repositories/account.repository';
import type { PasswordHasher } from '../../services/password-hasher';
import type { TokenService } from '../../services/token-service';
import type { Account } from '../../models/account';
import type { AccountId } from '@shared/schemas/common';

// ============================================================
// モックヘルパー
// ============================================================

const mockAccount: Account = {
  id: 'account-id' as AccountId,
  name: 'テストユーザー',
  email: 'test@example.com',
  passwordHash: 'hashed_password',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

function createMockAccountRepository(account: Account | null = mockAccount): AccountRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(account),
    findById: vi.fn().mockResolvedValue(account),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockPasswordHasher(isValid = true): PasswordHasher {
  return {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    verify: vi.fn().mockResolvedValue(isValid),
  };
}

function createMockTokenService(): TokenService {
  return {
    generate: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn().mockReturnValue({ accountId: 'account-id' }),
  };
}

// ============================================================
// LoginUseCase テスト
// ============================================================

describe('LoginUseCase', () => {
  let repository: AccountRepository;
  let passwordHasher: PasswordHasher;
  let tokenService: TokenService;
  let usecase: ReturnType<typeof createLoginUseCase>;

  const validInput = {
    email: 'test@example.com',
    password: 'password123',
  };

  beforeEach(() => {
    repository = createMockAccountRepository();
    passwordHasher = createMockPasswordHasher();
    tokenService = createMockTokenService();
    usecase = createLoginUseCase(repository, passwordHasher, tokenService);
  });

  describe('成功ケース', () => {
    it('有効な認証情報でログインし、tokenとアカウント情報を返す', async () => {
      const result = await usecase(validInput);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.token).toBe('mock-jwt-token');
      expect(result.value.account).toEqual({
        id: 'account-id',
        name: 'テストユーザー',
        email: 'test@example.com',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
    });

    it('tokenServiceのgenerateがaccountIdで呼ばれる', async () => {
      await usecase(validInput);

      expect(tokenService.generate).toHaveBeenCalledWith({ accountId: 'account-id' });
    });

    it('passwordHasherのverifyが呼ばれる', async () => {
      await usecase(validInput);

      expect(passwordHasher.verify).toHaveBeenCalledWith('password123', 'hashed_password');
    });
  });

  describe('エラーケース', () => {
    it('メールアドレスが存在しない場合、InvalidCredentialsエラーを返す', async () => {
      const repoWithNoAccount = createMockAccountRepository(null);
      const usecaseWithNoAccount = createLoginUseCase(
        repoWithNoAccount,
        passwordHasher,
        tokenService
      );

      const result = await usecaseWithNoAccount(validInput);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.type).toBe('InvalidCredentials');
    });

    it('パスワードが不正な場合、InvalidCredentialsエラーを返す', async () => {
      const invalidPasswordHasher = createMockPasswordHasher(false);
      const usecaseWithInvalidPassword = createLoginUseCase(
        repository,
        invalidPasswordHasher,
        tokenService
      );

      const result = await usecaseWithInvalidPassword(validInput);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.type).toBe('InvalidCredentials');
    });
  });
});
