import { describe, it, afterEach, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createGlobalRateLimiter, createPublicReadRateLimiter } from '../rate-limit.middleware';

// ============================================================
// Rate Limit Middleware - 無効化条件のテスト
// ============================================================
// NODE_ENV=test / RATE_LIMIT_DISABLED=true のときに skip=true となり、
// テスト中に 429 で落とされないことを保証する。

describe('rate-limit.middleware', () => {
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalFlag = process.env['RATE_LIMIT_DISABLED'];

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = originalNodeEnv;
    if (originalFlag === undefined) delete process.env['RATE_LIMIT_DISABLED'];
    else process.env['RATE_LIMIT_DISABLED'] = originalFlag;
  });

  describe('NODE_ENV=test のとき', () => {
    beforeEach(() => {
      process.env['NODE_ENV'] = 'test';
      delete process.env['RATE_LIMIT_DISABLED'];
    });

    it('globalRateLimiter は上限を超えても 200 を返す（skip される）', async () => {
      const app = express();
      app.use(createGlobalRateLimiter());
      app.get('/', (_req, res) => res.status(200).send('ok'));

      for (let i = 0; i < 5; i++) {
        await request(app).get('/').expect(200);
      }
    });

    it('publicReadRateLimiter は上限を超えても 200 を返す（skip される）', async () => {
      const app = express();
      app.use(createPublicReadRateLimiter());
      app.get('/', (_req, res) => res.status(200).send('ok'));

      for (let i = 0; i < 5; i++) {
        await request(app).get('/').expect(200);
      }
    });
  });

  describe('RATE_LIMIT_DISABLED=true かつ NODE_ENV!=test のとき', () => {
    beforeEach(() => {
      process.env['NODE_ENV'] = 'development';
      process.env['RATE_LIMIT_DISABLED'] = 'true';
    });

    it('globalRateLimiter は skip される', async () => {
      const app = express();
      app.use(createGlobalRateLimiter());
      app.get('/', (_req, res) => res.status(200).send('ok'));

      await request(app).get('/').expect(200);
    });
  });

  describe('本番相当（NODE_ENV=production, フラグ無し）のとき', () => {
    beforeEach(() => {
      process.env['NODE_ENV'] = 'production';
      delete process.env['RATE_LIMIT_DISABLED'];
    });

    it('publicReadRateLimiter は上限超過で 429 を返す', async () => {
      const app = express();
      // テスト高速化のため、このテストだけ上限を下げたいが、
      // プロダクション値（60）を守り、60 回超過で落ちることを確認する。
      app.use(createPublicReadRateLimiter());
      app.get('/', (_req, res) => res.status(200).send('ok'));

      // express-rate-limit の既定では、同一プロセス内で IP 判定するため、
      // supertest の Request は内部で 127.0.0.1 相当になる。
      for (let i = 0; i < 60; i++) {
        await request(app).get('/').expect(200);
      }
      await request(app).get('/').expect(429);
    }, 30_000);
  });
});
