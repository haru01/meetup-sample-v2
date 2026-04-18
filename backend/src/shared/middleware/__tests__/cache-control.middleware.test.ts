import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../../app';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearAuthTables,
  clearMeetupTables,
} from '../../../infrastructure/test-helper';

// ============================================================
// Cache-Control ヘッダ E2E
// ============================================================

describe('Cache-Control ヘッダ', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
    await clearAuthTables(prisma);
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  it('公開 GET /communities は public + short-TTL のキャッシュヘッダを返す', async () => {
    const res = await request(app).get('/communities').expect(200);
    expect(res.headers['cache-control']).toMatch(/public/);
    expect(res.headers['cache-control']).toMatch(/max-age=/);
    expect(res.headers['cache-control']).toMatch(/stale-while-revalidate=/);
  });

  it('認証必須エンドポイントは private, no-store を返す', async () => {
    await request(app)
      .post('/auth/register')
      .send({ name: 'cache-test', email: 'cache@example.com', password: 'password123' })
      .expect(201);
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'cache@example.com', password: 'password123' })
      .expect(200);
    const token = loginRes.body.token as string;

    const res = await request(app)
      .get('/participations/my')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.headers['cache-control']).toMatch(/no-store/);
  });
});
