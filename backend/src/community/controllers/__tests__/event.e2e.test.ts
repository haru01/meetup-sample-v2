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
// テスト用ヘルパー
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
      name: `テストコミュニティ${Date.now()}`,
      description: 'テスト用',
      category: 'TECH',
      visibility: 'PUBLIC',
    })
    .expect(201);
  return res.body.community.id as string;
}

const 有効なイベントデータ = () => ({
  title: 'TypeScript もくもく会',
  description: 'TypeScriptでもくもくプログラミングする会',
  startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
  format: 'ONLINE',
  capacity: 50,
});

// ============================================================
// POST /communities/:id/events E2E テスト
// ============================================================

describe('POST /communities/:id/events', () => {
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

  describe('オーナーが有効なデータを送信した場合', () => {
    it('201 が返り、作成されたイベント情報が含まれること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const eventData = 有効なイベントデータ();

      const response = await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send(eventData)
        .expect(201);

      expect(response.body.event.id).toBeDefined();
      expect(response.body.event.title).toBe('TypeScript もくもく会');
      expect(response.body.event.status).toBe('DRAFT');
      expect(response.body.event.communityId).toBe(communityId);
      expect(response.body.event.format).toBe('ONLINE');
      expect(response.body.event.capacity).toBe(50);
    });
  });

  describe('認証なしでリクエストした場合', () => {
    it('401 が返ること', async () => {
      await request(app)
        .post('/communities/00000000-0000-0000-0000-000000000000/events')
        .send(有効なイベントデータ())
        .expect(401);
    });
  });

  describe('一般メンバー（MEMBER ロール）がリクエストした場合', () => {
    it('403 が返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner2@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });
      await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(有効なイベントデータ())
        .expect(403);
    });
  });

  describe('存在しないコミュニティの場合', () => {
    it('403 が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'ユーザー',
        email: 'user@example.com',
        password: 'password123',
      });

      await request(app)
        .post('/communities/00000000-0000-0000-0000-000000000000/events')
        .set('Authorization', `Bearer ${token}`)
        .send(有効なイベントデータ())
        .expect(403);
    });
  });

  describe('開始日時が過去の場合', () => {
    it('422 EVENT_DATE_IN_PAST が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner3@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);

      const response = await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...有効なイベントデータ(),
          startsAt: '2020-01-01T00:00:00.000Z',
          endsAt: '2020-01-01T02:00:00.000Z',
        })
        .expect(422);

      expect(response.body.code).toBe('EVENT_DATE_IN_PAST');
    });
  });

  describe('終了日時が開始日時以前の場合', () => {
    it('422 EVENT_END_BEFORE_START が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner4@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, token);
      const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...有効なイベントデータ(),
          startsAt,
          endsAt: startsAt,
        })
        .expect(422);

      expect(response.body.code).toBe('EVENT_END_BEFORE_START');
    });
  });
});
