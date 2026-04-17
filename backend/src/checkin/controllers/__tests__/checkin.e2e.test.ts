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

async function 公開済みイベントを作成する(
  app: ReturnType<typeof createApp>,
  token: string,
  communityId: string
): Promise<string> {
  const createRes = await request(app)
    .post(`/communities/${communityId}/events`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'テストイベント',
      description: 'チェックインテスト用',
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      format: 'OFFLINE',
      capacity: 10,
    })
    .expect(201);
  const eventId = createRes.body.event.id as string;
  await request(app)
    .put(`/events/${eventId}/publish`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
  return eventId;
}

async function 承認済み参加者を用意する(
  app: ReturnType<typeof createApp>,
  ownerToken: string,
  eventId: string,
  memberEmail: string
): Promise<string> {
  const memberToken = await アカウントを登録してトークンを取得する(app, {
    name: memberEmail,
    email: memberEmail,
    password: 'password123',
  });
  const apply = await request(app)
    .post(`/events/${eventId}/participations`)
    .set('Authorization', `Bearer ${memberToken}`)
    .expect(201);
  await request(app)
    .post(`/events/${eventId}/participations/approve`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ participationIds: [apply.body.participation.id] })
    .expect(200);
  return memberToken;
}

// ============================================================
// CheckIn E2E テスト
// ============================================================

describe('CheckIn E2E', () => {
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

  describe('POST /events/:id/checkins', () => {
    it('APPROVED な参加者はチェックインできる', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await 公開済みイベントを作成する(app, ownerToken, communityId);
      const memberToken = await 承認済み参加者を用意する(
        app,
        ownerToken,
        eventId,
        'member@example.com'
      );

      const res = await request(app)
        .post(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      expect(res.body.checkin.eventId).toBe(eventId);
      expect(res.body.checkin.checkedInAt).toBeDefined();
    });

    it('APPLIED のみで未承認の参加者はチェックインできず 422 を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await 公開済みイベントを作成する(app, ownerToken, communityId);

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
        .post(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(422);
    });

    it('参加申し込みのないアカウントは 404 を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await 公開済みイベントを作成する(app, ownerToken, communityId);

      const strangerToken = await アカウントを登録してトークンを取得する(app, {
        name: '他人',
        email: 'stranger@example.com',
        password: 'password123',
      });

      await request(app)
        .post(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });

    it('同一参加者による二重チェックインは 409 を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await 公開済みイベントを作成する(app, ownerToken, communityId);
      const memberToken = await 承認済み参加者を用意する(
        app,
        ownerToken,
        eventId,
        'member@example.com'
      );

      await request(app)
        .post(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      await request(app)
        .post(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(409);
    });

    it('未認証は 401 を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await 公開済みイベントを作成する(app, ownerToken, communityId);

      await request(app).post(`/events/${eventId}/checkins`).expect(401);
    });
  });

  describe('GET /events/:id/checkins', () => {
    it('主催者はチェックイン一覧を取得できる', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await 公開済みイベントを作成する(app, ownerToken, communityId);
      const memberToken = await 承認済み参加者を用意する(
        app,
        ownerToken,
        eventId,
        'member@example.com'
      );
      await request(app)
        .post(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(201);

      const res = await request(app)
        .get(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.checkins).toHaveLength(1);
      expect(res.body.checkins[0].eventId).toBe(eventId);
    });

    it('主催者以外は 403 を返す', async () => {
      const ownerToken = await アカウントを登録してトークンを取得する(app, {
        name: 'オーナー',
        email: 'owner@example.com',
        password: 'password123',
      });
      const communityId = await コミュニティを作成する(app, ownerToken);
      const eventId = await 公開済みイベントを作成する(app, ownerToken, communityId);
      const memberToken = await 承認済み参加者を用意する(
        app,
        ownerToken,
        eventId,
        'member@example.com'
      );

      await request(app)
        .get(`/events/${eventId}/checkins`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });
  });
});
