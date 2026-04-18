import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

// ============================================================
// Rate Limit Middleware
// ============================================================

const isRateLimitDisabled = (): boolean =>
  process.env['NODE_ENV'] === 'test' || process.env['RATE_LIMIT_DISABLED'] === 'true';

/**
 * 全リクエスト共通のゆるめのレート制限（IP ベース）。
 * DoS 耐性の底上げを目的とし、通常の利用では当たらない水準に設定する。
 */
export function createGlobalRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isRateLimitDisabled(),
    message: {
      code: 'TOO_MANY_REQUESTS',
      message: 'リクエストが多すぎます。しばらく待ってください',
    },
  });
}

/**
 * 未ログイン到達可能な公開 GET 向けの厳しめレート制限。
 * 列挙・スクレイピング耐性を上げるため、global より低めの上限を設定する。
 */
export function createPublicReadRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isRateLimitDisabled(),
    message: {
      code: 'TOO_MANY_REQUESTS',
      message: 'リクエストが多すぎます。しばらく待ってください',
    },
  });
}
