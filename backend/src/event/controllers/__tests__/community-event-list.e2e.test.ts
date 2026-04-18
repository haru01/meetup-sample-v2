import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
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
// pagination / DRAFT フィルタ / total レスポンスを検証
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

async function DRAFTイベントを作成する(
  app: ReturnType<typeof createApp>,
  token: string,
  communityId: string,
  overrides: Partial<{ title: string; startsAt: string; endsAt: string }> = {}
): Promise<string> {
  const startsAt =
    overrides.startsAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const endsAt =
    overrides.endsAt ??
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString();
  const res = await request(app)
    .post(`/communities/${communityId}/events`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: overrides.title ?? 'TypeScript もくもく会',
      description: 'テスト用イベント',
      startsAt,
      endsAt,
      format: 'ONLINE',
      capacity: 50,
    })
    .expect(201);
  return res.body.event.id as string;
}

async function PUBLISHEDイベントを作成する(
  app: ReturnType<typeof createApp>,
  token: string,
  communityId: string,
  overrides: Partial<{ title: string; startsAt: string; endsAt: string }> = {}
): Promise<string> {
  const eventId = await DRAFTイベントを作成する(app, token, communityId, overrides);
  await request(app)
    .put(`/events/${eventId}/publish`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return eventId;
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

  describe('DRAFT フィルタ', () => {
    it('未ログインユーザーには DRAFT が返らず total も DRAFT を含まないこと', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      await PUBLISHEDイベントを作成する(app, ownerToken, communityId, {
        title: '公開イベント',
      });
      await DRAFTイベントを作成する(app, ownerToken, communityId, {
        title: '下書きイベント',
      });

      const response = await request(app).get(`/communities/${communityId}/events`).expect(200);

      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].status).toBe('PUBLISHED');
      expect(response.body.total).toBe(1);
    });

    it('作成者本人には自身の DRAFT も含めて返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-owner2@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      await PUBLISHEDイベントを作成する(app, ownerToken, communityId, {
        title: '公開イベント',
      });
      await DRAFTイベントを作成する(app, ownerToken, communityId, {
        title: '下書きイベント',
      });

      const response = await request(app)
        .get(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.events).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('別ユーザーには他人の DRAFT が返らないこと', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-owner3@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      await PUBLISHEDイベントを作成する(app, ownerToken, communityId, {
        title: '公開イベント',
      });
      await DRAFTイベントを作成する(app, ownerToken, communityId, {
        title: '下書きイベント',
      });

      const otherToken = await アカウントを登録してトークンを取得する(app, {
        name: '別ユーザー',
        email: 'list-other@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .get(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].status).toBe('PUBLISHED');
      expect(response.body.total).toBe(1);
    });
  });

  describe('ページネーション', () => {
    it('limit と offset を指定した場合、部分集合と正しい total が返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-pagination@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      const baseStart = Date.now() + 7 * 24 * 60 * 60 * 1000;
      for (let i = 0; i < 3; i++) {
        const startsAt = new Date(baseStart + i * 60 * 60 * 1000).toISOString();
        const endsAt = new Date(baseStart + i * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
        await PUBLISHEDイベントを作成する(app, ownerToken, communityId, {
          title: `イベント${i}`,
          startsAt,
          endsAt,
        });
      }

      const response = await request(app)
        .get(`/communities/${communityId}/events?limit=2&offset=1`)
        .expect(200);

      expect(response.body.events).toHaveLength(2);
      expect(response.body.total).toBe(3);
    });

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
