import jwt from 'jsonwebtoken';
import type { TokenService } from './token-service';

const TOKEN_EXPIRY_SECONDS = 86400; // 24時間

/**
 * JWTトークンサービス実装
 */
export class JwtTokenService implements TokenService {
  private readonly secret: string;

  constructor(secret?: string) {
    this.secret = secret ?? process.env.JWT_SECRET ?? '';
  }

  generate(payload: { accountId: string }): string {
    return jwt.sign({ accountId: payload.accountId }, this.secret, {
      expiresIn: TOKEN_EXPIRY_SECONDS,
    });
  }

  verify(token: string): { accountId: string } | null {
    try {
      const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;
      if (typeof decoded.accountId !== 'string') {
        return null;
      }
      return { accountId: decoded.accountId };
    } catch {
      return null;
    }
  }
}
