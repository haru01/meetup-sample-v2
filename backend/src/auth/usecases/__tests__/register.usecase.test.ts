import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRegisterUseCase } from '../register.usecase';
import type { AccountRepository } from '../../repositories/account.repository';
import type { PasswordHasher } from '../../services/password-hasher';
import type { Account } from '../../models/account';
import type { AccountId } from '@shared/schemas/common';

// ============================================================
// モックヘルパー
// ============================================================

function createMockAccountRepository(existingAccount?: Account): AccountRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(existingAccount ?? null),
    findById: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockPasswordHasher(): PasswordHasher {
  return {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    verify: vi.fn().mockResolvedValue(true),
  };
}

// ============================================================
// RegisterUseCase テスト
// ============================================================

describe('RegisterUseCase', () => {
  let repository: AccountRepository;
  let passwordHasher: PasswordHasher;
  let usecase: ReturnType<typeof createRegisterUseCase>;

  const validInput = {
    name: 'テストユーザー',
    email: 'test@example.com',
    password: 'password123',
    id: 'test-account-id' as AccountId,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    repository = createMockAccountRepository();
    passwordHasher = createMockPasswordHasher();
    usecase = createRegisterUseCase(repository, passwordHasher);
  });

  describe('成功ケース', () => {
    it('有効な入力でアカウントを登録し、Accountを返す', async () => {
      const result = await usecase(validInput);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.value.name).toBe('テストユーザー');
      expect(result.value.email).toBe('test@example.com');
      expect(result.value.id).toBe('test-account-id');
    });

    it('パスワードがハッシュ化されて保存される', async () => {
      const result = await usecase(validInput);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(passwordHasher.hash).toHaveBeenCalledWith('password123');
      expect(result.value.passwordHash).toBe('hashed_password');
    });

    it('repositoryのsaveが呼ばれる', async () => {
      await usecase(validInput);

      expect(repository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('エラーケース', () => {
    it('メールアドレス重複の場合、DuplicateEmailエラーを返す', async () => {
      const existingAccount: Account = {
        id: 'existing-id' as AccountId,
        name: '既存ユーザー',
        email: 'test@example.com',
        passwordHash: 'some-hash',
        createdAt: new Date(),
      };
      const repoWithExisting = createMockAccountRepository(existingAccount);
      const usecaseWithExisting = createRegisterUseCase(repoWithExisting, passwordHasher);

      const result = await usecaseWithExisting(validInput);

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.type).toBe('DuplicateEmail');
    });
  });
});
