import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../../app';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearMeetupTables,
} from '../../../infrastructure/test-helper';

// ============================================================
// POST /scheduler/send-reminders E2E テスト
// ============================================================

describe('POST /scheduler/send-reminders', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  async function 公開イベントと承認済み参加を作成する(options: {
    startsAt: Date;
  }): Promise<{ eventId: string; accountId: string }> {
    const uniq = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const account = await prisma.account.create({
      data: {
        name: 'オーナー',
        email: `owner-${uniq}@example.com`,
        passwordHash: 'hashed',
      },
    });
    const community = await prisma.community.create({
      data: {
        name: `コミュニティ-${uniq}`,
        description: 'スケジューラテスト用',
        category: 'TECH',
        visibility: 'PUBLIC',
      },
    });
    await prisma.communityMember.create({
      data: {
        communityId: community.id,
        accountId: account.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
    const event = await prisma.event.create({
      data: {
        communityId: community.id,
        createdBy: account.id,
        title: 'リマインダ対象イベント',
        startsAt: options.startsAt,
        endsAt: new Date(options.startsAt.getTime() + 2 * 60 * 60 * 1000),
        format: 'ONLINE',
        capacity: 50,
        status: 'PUBLISHED',
      },
    });
    await prisma.participation.create({
      data: {
        eventId: event.id,
        accountId: account.id,
        status: 'APPROVED',
      },
    });
    return { eventId: event.id, accountId: account.id };
  }

  describe('SCHEDULER_SECRET が設定されていて secret ヘッダが一致する場合', () => {
    it('20-28 時間後に開始する PUBLISHED イベントが存在すると 200 と detected:1 を返し、REMINDER 通知が保存されること', async () => {
      vi.stubEnv('SCHEDULER_SECRET', 'test-secret');
      const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const { eventId } = await 公開イベントと承認済み参加を作成する({ startsAt });

      const response = await request(app)
        .post('/scheduler/send-reminders')
        .set('X-Scheduler-Secret', 'test-secret')
        .expect(200);

      expect(response.body).toEqual({ detected: 1 });

      const notifications = await prisma.notification.findMany({ where: { type: 'REMINDER' } });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.payload).toContain(eventId);
    });

    it('window 外に開始するイベントしか存在しない場合は 200 と detected:0 を返し、通知は保存されないこと', async () => {
      vi.stubEnv('SCHEDULER_SECRET', 'test-secret');
      const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000);
      await 公開イベントと承認済み参加を作成する({ startsAt });

      const response = await request(app)
        .post('/scheduler/send-reminders')
        .set('X-Scheduler-Secret', 'test-secret')
        .expect(200);

      expect(response.body).toEqual({ detected: 0 });
      const notifications = await prisma.notification.findMany({ where: { type: 'REMINDER' } });
      expect(notifications).toHaveLength(0);
    });
  });

  describe('secret ヘッダが不正な場合', () => {
    it('ヘッダが不一致の場合は 401 UNAUTHORIZED を返す', async () => {
      vi.stubEnv('SCHEDULER_SECRET', 'test-secret');

      const response = await request(app)
        .post('/scheduler/send-reminders')
        .set('X-Scheduler-Secret', 'wrong-secret')
        .expect(401);

      expect(response.body).toEqual({
        code: 'UNAUTHORIZED',
        message: 'Invalid scheduler secret',
      });
    });

    it('ヘッダが未添付の場合は OpenAPI Validator により 400 が返る', async () => {
      vi.stubEnv('SCHEDULER_SECRET', 'test-secret');

      const response = await request(app).post('/scheduler/send-reminders').expect(400);

      expect(response.body.code).toBeDefined();
    });
  });

  describe('SCHEDULER_SECRET が未設定の場合', () => {
    it('空文字の SCHEDULER_SECRET では正しそうなヘッダを付与しても 401 UNAUTHORIZED を返す', async () => {
      vi.stubEnv('SCHEDULER_SECRET', '');

      const response = await request(app)
        .post('/scheduler/send-reminders')
        .set('X-Scheduler-Secret', 'any-value')
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });
});
