import { describe, it, expect } from 'vitest';
import { createAccount } from '../account';
import { createAccountId } from '@shared/schemas/id-factories';
import { RegisterNameSchema, RegisterEmailSchema } from '../schemas/account.schema';

// ============================================================
// アカウントモデルのテスト
// ============================================================

describe('createAccount ファクトリ', () => {
  const validInput = {
    id: createAccountId('00000000-0000-0000-0000-000000000001'),
    name: 'テストユーザー',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('全フィールドを持つアカウントを作成できる', () => {
    const result = createAccount(validInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(validInput.id);
      expect(result.value.name).toBe(validInput.name);
      expect(result.value.email).toBe(validInput.email);
      expect(result.value.passwordHash).toBe(validInput.passwordHash);
      expect(result.value.createdAt).toBe(validInput.createdAt);
    }
  });

  it('Result<Account, never> を返す', () => {
    const result = createAccount(validInput);
    expect(result.ok).toBe(true);
  });

  it('エラーを返さない（常に成功する）', () => {
    const result = createAccount(validInput);
    expect(result.ok).toBe(true);
  });
});

// ============================================================
// Zod スキーマのテスト
// ============================================================

describe('RegisterNameSchema', () => {
  it('有効な名前（1文字）を受け入れる', () => {
    expect(RegisterNameSchema.safeParse('a').success).toBe(true);
  });

  it('有効な名前（100文字）を受け入れる', () => {
    expect(RegisterNameSchema.safeParse('a'.repeat(100)).success).toBe(true);
  });

  it('空文字列を拒否する', () => {
    expect(RegisterNameSchema.safeParse('').success).toBe(false);
  });

  it('101文字を超える名前を拒否する', () => {
    expect(RegisterNameSchema.safeParse('a'.repeat(101)).success).toBe(false);
  });
});

describe('RegisterEmailSchema', () => {
  it('有効なメールアドレスを受け入れる', () => {
    expect(RegisterEmailSchema.safeParse('user@example.com').success).toBe(true);
  });

  it('無効なメールアドレス形式を拒否する', () => {
    expect(RegisterEmailSchema.safeParse('not-an-email').success).toBe(false);
  });

  it('@のないアドレスを拒否する', () => {
    expect(RegisterEmailSchema.safeParse('userexample.com').success).toBe(false);
  });

  it('ドメインのないアドレスを拒否する', () => {
    expect(RegisterEmailSchema.safeParse('user@').success).toBe(false);
  });
});
