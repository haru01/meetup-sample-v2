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

async function イベントを作成して公開する(
  app: ReturnType<typeof createApp>,
  token: string,
  communityId: string,
  capacity: number = 2
): Promise<string> {
  const createRes = await request(app)
    .post(`/communities/${communityId}/events`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'テストイベント',
      description: '参加テスト用',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      format: 'ONLINE',
      capacity,
    })
    .expect(201);
  const eventId = createRes.body.event.id as string;
  await request(app)
    .put(`/events/${eventId}/publish`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return eventId;
}

// ============================================================
// Participation E2E テスト
// ============================================================

describe('Participation E2E', () => {
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

  describe('POST /events/:id/participations', () => {
    it('公開済みイベントに参加者が申し込むと 201 で APPLIED 状態になる', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });

      const res = await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      expect(res.body.participation.status).toBe('APPLIED');
      expect(res.body.participation.eventId).toBe(eventId);
    });

    it('同一イベントへの二重申込は 409 を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });

      await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(409);
    });

    it('定員超過時は WAITLISTED 状態で登録される（AutoWaitlistIfFull）', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId, 1);

      const member1Token = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー1',
        email: 'member1@example.com',
        password: 'password123',
      });
      const apply1 = await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${member1Token}`)
        .expect(201);
      const participationId1 = apply1.body.participation.id as string;

      // 承認して APPROVED にする（capacity=1 を埋める）
      await request(app)
        .post(`/events/${eventId}/participations/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ participationIds: [participationId1] })
        .expect(200);

      const member2Token = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー2',
        email: 'member2@example.com',
        password: 'password123',
      });
      const res = await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${member2Token}`)
        .expect(201);

      expect(res.body.participation.status).toBe('WAITLISTED');
    });
  });

  describe('POST /events/:id/participations/approve', () => {
    it('主催者は APPLIED の参加者をまとめて APPROVED にできる', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });
      const apply = await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      const res = await request(app)
        .post(`/events/${eventId}/participations/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ participationIds: [apply.body.participation.id] })
        .expect(200);

      expect(res.body.approved).toBe(1);
    });

    it('主催者以外は 403 を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });
      const apply = await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      await request(app)
        .post(`/events/${eventId}/participations/approve`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ participationIds: [apply.body.participation.id] })
        .expect(403);
    });
  });

  describe('DELETE /participations/:id', () => {
    it('参加者自身は参加をキャンセルできる', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });
      const apply = await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      const res = await request(app)
        .delete(`/participations/${apply.body.participation.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.participation.status).toBe('CANCELLED');
    });
  });

  describe('GET /events/:id/capacity', () => {
    it('残席数と定員を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId, 5);

      const res = await request(app).get(`/events/${eventId}/capacity`).expect(200);
      expect(res.body.capacity).toBe(5);
      expect(res.body.remaining).toBe(5);
    });
  });

  describe('GET /participations/my', () => {
    it('自分の参加一覧が取得できる', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await イベントを作成して公開する(app, ownerToken, communityId);

      const memberToken = await アカウントを登録してトークンを取得する(app, {
        name: 'メンバー',
        email: 'member@example.com',
        password: 'password123',
      });
      await request(app)
        .post(`/events/${eventId}/participations`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      const res = await request(app)
        .get('/participations/my')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(res.body.participations).toHaveLength(1);
      expect(res.body.participations[0].eventId).toBe(eventId);
    });
  });
});
