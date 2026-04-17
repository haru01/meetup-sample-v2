import bcrypt from 'bcrypt';
import type { PasswordHasher } from './password-hasher';

const SALT_ROUNDS = 10;

/**
 * bcryptを使用したパスワードハッシュ化実装
 */
export class BcryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
