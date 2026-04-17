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
// Event ライフサイクル E2E テスト
// event.controller の list / get / publish / update / close / cancel を網羅
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

describe('Event ライフサイクル E2E', () => {
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

  describe('GET /events — 公開済みイベント一覧', () => {
    it('PUBLISHED のみを返し、DRAFT は含まれないこと', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const publishedId = await DRAFTイベントを作成する(app, token, communityId, {
        title: '公開済みイベント',
      });
      await DRAFTイベントを作成する(app, token, communityId, { title: '下書きイベント' });

      await request(app)
        .put(`/events/${publishedId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app).get('/events').expect(200);

      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].id).toBe(publishedId);
      expect(response.body.events[0].status).toBe('PUBLISHED');
    });

    it('イベントが存在しない場合は空配列を返す', async () => {
      const response = await request(app).get('/events').expect(200);
      expect(response.body.events).toEqual([]);
    });
  });

  describe('GET /events/:id — イベント詳細取得', () => {
    it('存在するイベントの場合は 200 と詳細を返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'get-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventId = await DRAFTイベントを作成する(app, token, communityId);

      const response = await request(app).get(`/events/${eventId}`).expect(200);

      expect(response.body.event.id).toBe(eventId);
      expect(response.body.event.status).toBe('DRAFT');
    });

    it('存在しないイベントの場合は 404 EVENT_NOT_FOUND を返す', async () => {
      const response = await request(app)
        .get('/events/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.code).toBe('EVENT_NOT_FOUND');
    });
  });

  describe('PUT /events/:id/publish — イベント公開', () => {
    it('作成者が DRAFT イベントを公開すると 200 と PUBLISHED ステータスを返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'pub-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventId = await DRAFTイベントを作成する(app, token, communityId);

      const response = await request(app)
        .put(`/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.event.status).toBe('PUBLISHED');
    });

    it('作成者以外が公開しようとすると 403 UNAUTHORIZED を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'pub-owner2@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await DRAFTイベントを作成する(app, ownerToken, communityId);

      const otherToken = await アカウントを登録してトークンを取得する(app, {
        name: '別ユーザー',
        email: 'pub-other@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .put(`/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('既に PUBLISHED のイベントを再度公開しようとすると 409 EVENT_ALREADY_PUBLISHED を返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'pub-owner3@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventId = await DRAFTイベントを作成する(app, token, communityId);

      await request(app)
        .put(`/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app)
        .put(`/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.code).toBe('EVENT_ALREADY_PUBLISHED');
    });

    it('認証なしでリクエストすると 401 を返す', async () => {
      await request(app).put('/events/00000000-0000-0000-0000-000000000000/publish').expect(401);
    });

    it('存在しないイベントを公開しようとすると 404 EVENT_NOT_FOUND を返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'ユーザー',
        email: 'pub-nf@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .put('/events/00000000-0000-0000-0000-000000000000/publish')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.code).toBe('EVENT_NOT_FOUND');
    });
  });

  describe('PATCH /events/:id — イベント編集', () => {
    it('作成者が DRAFT イベントのタイトルを編集すると 200 と更新後の値を返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'upd-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventId = await DRAFTイベントを作成する(app, token, communityId);

      const response = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '更新後のタイトル', capacity: 100 })
        .expect(200);

      expect(response.body.event.title).toBe('更新後のタイトル');
      expect(response.body.event.capacity).toBe(100);
    });

    it('作成者以外が編集しようとすると 403 UNAUTHORIZED を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'upd-owner2@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await DRAFTイベントを作成する(app, ownerToken, communityId);

      const otherToken = await アカウントを登録してトークンを取得する(app, {
        name: '別ユーザー',
        email: 'upd-other@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .patch(`/events/${eventId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: '乗っ取り' })
        .expect(403);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('認証なしでリクエストすると 401 を返す', async () => {
      await request(app)
        .patch('/events/00000000-0000-0000-0000-000000000000')
        .send({ title: 'x' })
        .expect(401);
    });
  });

  describe('POST /events/:id/close — イベントクローズ', () => {
    it('作成者が PUBLISHED イベントをクローズすると 200 と CLOSED ステータスを返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'close-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventId = await DRAFTイベントを作成する(app, token, communityId);
      await request(app)
        .put(`/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app)
        .post(`/events/${eventId}/close`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.event.status).toBe('CLOSED');
    });

    it('DRAFT イベントをクローズしようとすると 409 EVENT_NOT_YET_HELD を返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'close-draft@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventId = await DRAFTイベントを作成する(app, token, communityId);

      const response = await request(app)
        .post(`/events/${eventId}/close`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);

      expect(response.body.code).toBe('EVENT_NOT_YET_HELD');
    });

    it('認証なしでリクエストすると 401 を返す', async () => {
      await request(app).post('/events/00000000-0000-0000-0000-000000000000/close').expect(401);
    });
  });

  describe('POST /events/:id/cancel — イベント中止', () => {
    it('作成者が PUBLISHED イベントを中止すると 200 と CANCELLED ステータスを返す', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'cancel-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventId = await DRAFTイベントを作成する(app, token, communityId);
      await request(app)
        .put(`/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const response = await request(app)
        .post(`/events/${eventId}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.event.status).toBe('CANCELLED');
    });

    it('作成者以外が中止しようとすると 403 UNAUTHORIZED を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'cancel-owner2@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await DRAFTイベントを作成する(app, ownerToken, communityId);

      const otherToken = await アカウントを登録してトークンを取得する(app, {
        name: '別ユーザー',
        email: 'cancel-other@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post(`/events/${eventId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('認証なしでリクエストすると 401 を返す', async () => {
      await request(app).post('/events/00000000-0000-0000-0000-000000000000/cancel').expect(401);
    });
  });
});
