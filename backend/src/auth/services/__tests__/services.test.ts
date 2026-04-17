import { describe, it, expect } from 'vitest';
import { BcryptPasswordHasher } from '../bcrypt-password-hasher';
import { JwtTokenService } from '../jwt-token-service';

const TEST_SECRET = 'test-secret-key-for-unit-tests';

describe('BcryptPasswordHasher', () => {
  const hasher = new BcryptPasswordHasher();

  it('ハッシュ化されたパスワードは元のパスワードと異なる文字列を返す', async () => {
    const password = 'mySecretPassword123';
    const hashed = await hasher.hash(password);
    expect(hashed).not.toBe(password);
    expect(typeof hashed).toBe('string');
    expect(hashed.length).toBeGreaterThan(0);
  });

  it('正しいパスワードでverifyするとtrueを返す', async () => {
    const password = 'mySecretPassword123';
    const hashed = await hasher.hash(password);
    const result = await hasher.verify(password, hashed);
    expect(result).toBe(true);
  });

  it('間違ったパスワードでverifyするとfalseを返す', async () => {
    const password = 'mySecretPassword123';
    const hashed = await hasher.hash(password);
    const result = await hasher.verify('wrongPassword', hashed);
    expect(result).toBe(false);
  });
});

describe('JwtTokenService', () => {
  const service = new JwtTokenService(TEST_SECRET);

  it('generateはJWT文字列を返す', () => {
    const token = service.generate({ accountId: 'account-123' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyは有効なトークンからaccountIdを取得できる', () => {
    const token = service.generate({ accountId: 'account-123' });
    const result = service.verify(token);
    expect(result).not.toBeNull();
    expect(result?.accountId).toBe('account-123');
  });

  it('無効なトークンでverifyするとnullを返す', () => {
    const result = service.verify('invalid.token.string');
    expect(result).toBeNull();
  });

  it('別のsecretで署名されたトークンはverifyするとnullを返す', () => {
    const otherService = new JwtTokenService('other-secret');
    const token = otherService.generate({ accountId: 'account-123' });
    const result = service.verify(token);
    expect(result).toBeNull();
  });
});
