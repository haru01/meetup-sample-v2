import { describe, it, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../../app';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearMeetupTables,
} from '../../../infrastructure/test-helper';

// ============================================================
// GET /communities/:id/events E2E テスト
// 現時点では CreateEvent のみ実装済みのため、ページネーションの
// バリデーションのみ検証。PublishEvent 実装時に DRAFT フィルタ等の
// テストを追加すること。
// ============================================================

async function アカウントを登録してトークンを取得する(
  app: ReturnType<typeof createApp>,
  data: { name: string; email: string; password: string }
): Promise<string> {
  await request(app).post('/auth/register').send(data).expect(201);
  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: data.email, password: data.password })
    .expect(200);
  return loginRes.body.token as string;
}

async function コミュニティを作成する(
  app: ReturnType<typeof createApp>,
  token: string
): Promise<string> {
  const res = await request(app)
    .post('/communities')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `テストコミュニティ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: 'テスト用',
      category: 'TECH',
      visibility: 'PUBLIC',
    })
    .expect(201);
  return res.body.community.id as string;
}

describe('GET /communities/:id/events — コミュニティイベント一覧', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  describe('ページネーション', () => {
    it('limit=999999 を指定した場合は 400 が返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-limit-too-large@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      await request(app).get(`/communities/${communityId}/events?limit=999999`).expect(400);
    });

    it('limit=-1 を指定した場合は 400 が返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-limit-negative@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      await request(app).get(`/communities/${communityId}/events?limit=-1`).expect(400);
    });
  });
});
