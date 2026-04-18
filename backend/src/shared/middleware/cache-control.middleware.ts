import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ============================================================
// Cache-Control Middleware
// ============================================================

/**
 * 未ログイン到達可能な公開 GET 向けの短期 HTTP キャッシュヘッダを付与する。
 * 短い max-age で即時性を保ちつつ、stale-while-revalidate で可用性を上げる。
 */
export function publicReadCacheControl(maxAgeSeconds = 30, swrSeconds = 60): RequestHandler {
  const value = `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${swrSeconds}`;
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', value);
    next();
  };
}

/**
 * 認証必須エンドポイント向け。機密データのキャッシュを禁止する。
 */
export function privateNoStoreCacheControl(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  };
}
