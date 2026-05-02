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
// GET /communities/:id/events、POST /communities/:id/events E2E テスト
// ============================================================

async function アカウントを登録してトークンを取得する(
  app: ReturnType<typeof createApp>,
  data: { name: string; email: string; password: string }
): Promise<string> {
  const res = await request(app).post('/auth/register').send(data).expect(201);
  return res.body.token as string;
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

const 有効なイベントデータ = {
  title: 'TypeScript もくもく会',
  description: 'TypeScriptでもくもくプログラミングする会です',
  startsAt: '2099-07-01T19:00:00.000Z',
  endsAt: '2099-07-01T21:00:00.000Z',
  format: 'ONLINE',
  capacity: 50,
};

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

  describe('認証なしでの一覧取得', () => {
    it('200 が返り、events と total が含まれること（空リスト）', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'event-list-empty@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      const res = await request(app).get(`/communities/${communityId}/events`).expect(200);

      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.total).toBe(0);
    });

    it('PUBLISHED イベントが一覧に含まれること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'event-list-published@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(有効なイベントデータ)
        .expect(201);

      await prisma.event.updateMany({ data: { status: 'PUBLISHED' } });

      const res = await request(app).get(`/communities/${communityId}/events`).expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.events[0].title).toBe(有効なイベントデータ.title);
    });

    it('DRAFT イベントは認証なしでは一覧に含まれないこと', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'event-list-draft-anon@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(有効なイベントデータ)
        .expect(201);

      const res = await request(app).get(`/communities/${communityId}/events`).expect(200);

      expect(res.body.total).toBe(0);
    });
  });

  describe('認証ありでの一覧取得', () => {
    it('作成者には DRAFT イベントが一覧に含まれること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'event-list-draft-auth@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(有効なイベントデータ)
        .expect(201);

      const res = await request(app)
        .get(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.total).toBe(1);
    });
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

    it('有効な limit/offset を指定した場合は 200 が返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'list-limit-valid@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      const res = await request(app)
        .get(`/communities/${communityId}/events?limit=10&offset=0`)
        .expect(200);

      expect(res.body.total).toBe(0);
      expect(Array.isArray(res.body.events)).toBe(true);
    });
  });
});

// ============================================================
// POST /communities/:id/events — イベント作成
// ============================================================

describe('POST /communities/:id/events — イベント作成', () => {
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

  describe('オーナーがイベントを作成する場合', () => {
    it('201 が返り、DRAFT ステータスのイベントが作成されること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'event-create-owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      const res = await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(有効なイベントデータ)
        .expect(201);

      expect(res.body.event).toBeDefined();
      expect(res.body.event.title).toBe(有効なイベントデータ.title);
      expect(res.body.event.status).toBe('DRAFT');
      expect(res.body.event.id).toBeDefined();
    });
  });

  describe('過去の開始日時でイベントを作成しようとした場合', () => {
    it('422 が返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'event-create-past@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...有効なイベントデータ, startsAt: '2020-01-01T19:00:00.000Z' })
        .expect(422);
    });
  });

  describe('権限のないユーザーがイベントを作成しようとした場合', () => {
    it('403 が返ること', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'event-create-owner2@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'event-create-member@example.com',
        password: 'password123',
      });
      await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      await request(app)
        .post(`/communities/${communityId}/events`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(有効なイベントデータ)
        .expect(403);
    });
  });

  describe('認証トークンがない場合', () => {
    it('401 が返ること', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .post(`/communities/${nonExistentId}/events`)
        .send(有効なイベントデータ)
        .expect(401);
    });
  });
});
