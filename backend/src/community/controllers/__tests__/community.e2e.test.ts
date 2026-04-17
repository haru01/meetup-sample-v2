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

const 有効なコミュニティデータ = {
  name: 'TypeScript勉強会',
  description: 'TypeScriptを一緒に学ぶコミュニティです',
  category: 'TECH',
  visibility: 'PUBLIC',
};

// ============================================================
// POST /communities E2E テスト
// ============================================================

describe('POST /communities', () => {
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

  describe('認証済みユーザーが有効なデータを送信した場合', () => {
    it('201 が返り、作成されたコミュニティ情報が含まれること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'テストユーザー',
        email: 'owner@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send(有効なコミュニティデータ)
        .expect(201);

      expect(response.body.community.id).toBeDefined();
      expect(response.body.community.name).toBe('TypeScript勉強会');
      expect(response.body.community.description).toBe('TypeScriptを一緒に学ぶコミュニティです');
      expect(response.body.community.category).toBe('TECH');
      expect(response.body.community.visibility).toBe('PUBLIC');
      expect(response.body.community.createdAt).toBeDefined();
      expect(response.body.community.updatedAt).toBeDefined();
    });
  });

  describe('認証なしでリクエストした場合', () => {
    it('401 が返ること', async () => {
      const response = await request(app)
        .post('/communities')
        .send(有効なコミュニティデータ)
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('同じ名前のコミュニティが既に存在する場合', () => {
    it('409 DUPLICATE_COMMUNITY_NAME が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'テストユーザー',
        email: 'owner2@example.com',
        password: 'password123',
      });

      await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send(有効なコミュニティデータ)
        .expect(201);

      const response = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send(有効なコミュニティデータ)
        .expect(409);

      expect(response.body.code).toBe('DUPLICATE_COMMUNITY_NAME');
    });
  });

  describe('name が未指定の場合', () => {
    it('400 が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'テストユーザー',
        email: 'owner3@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ category: 'TECH', visibility: 'PUBLIC' })
        .expect(400);

      expect(response.body.code).toBeDefined();
    });
  });

  describe('category が不正な値の場合', () => {
    it('400 が返ること', async () => {
      const token = await アカウントを登録してトークンを取得する(app, {
        name: 'テストユーザー',
        email: 'owner4@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...有効なコミュニティデータ, category: 'INVALID' })
        .expect(400);

      expect(response.body.code).toBeDefined();
    });
  });
});

// ============================================================
// GET /communities E2E テスト
// ============================================================

describe('GET /communities', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
    token = await アカウントを登録してトークンを取得する(app, {
      name: 'テストユーザー',
      email: 'list-test@example.com',
      password: 'password123',
    });
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  describe('コミュニティが存在する場合', () => {
    it('PUBLIC コミュニティ一覧が返ること', async () => {
      await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'パブリックコミュニティ', category: 'TECH', visibility: 'PUBLIC' })
        .expect(201);

      const response = await request(app).get('/communities').expect(200);

      expect(Array.isArray(response.body.communities)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(response.body.communities.length).toBeGreaterThanOrEqual(1);

      const community = response.body.communities[0];
      expect(community.id).toBeDefined();
      expect(community.name).toBeDefined();
      expect(community.visibility).toBe('PUBLIC');
    });
  });

  describe('カテゴリフィルターを指定した場合', () => {
    it('指定したカテゴリのコミュニティのみ返ること', async () => {
      await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'TECHコミュニティ', category: 'TECH', visibility: 'PUBLIC' })
        .expect(201);

      await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'BUSINESSコミュニティ', category: 'BUSINESS', visibility: 'PUBLIC' })
        .expect(201);

      const response = await request(app).get('/communities?category=TECH').expect(200);

      expect(Array.isArray(response.body.communities)).toBe(true);
      for (const community of response.body.communities) {
        expect(community.category).toBe('TECH');
      }
    });
  });

  describe('?member=me を指定した場合', () => {
    it('認証済みユーザーが所属するコミュニティのみ返ること', async () => {
      await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '自分のコミュニティ', category: 'TECH', visibility: 'PUBLIC' })
        .expect(201);

      const response = await request(app)
        .get('/communities?member=me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body.communities)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('?member=me を認証なしで指定した場合', () => {
    it('401 が返ること', async () => {
      const response = await request(app).get('/communities?member=me').expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });
});

// ============================================================
// GET /communities/:id E2E テスト
// ============================================================

describe('GET /communities/:id', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;
  let token: string;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
    token = await アカウントを登録してトークンを取得する(app, {
      name: 'テストユーザー',
      email: 'get-test@example.com',
      password: 'password123',
    });
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  describe('存在するコミュニティIDを指定した場合', () => {
    it('200 が返り、コミュニティ情報が含まれること', async () => {
      const createRes = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '取得テストコミュニティ', category: 'TECH', visibility: 'PUBLIC' })
        .expect(201);

      const communityId = createRes.body.community.id as string;

      const response = await request(app).get(`/communities/${communityId}`).expect(200);

      expect(response.body.community.id).toBe(communityId);
      expect(response.body.community.name).toBe('取得テストコミュニティ');
      expect(response.body.community.category).toBe('TECH');
      expect(response.body.community.visibility).toBe('PUBLIC');
    });
  });

  describe('存在しないコミュニティIDを指定した場合', () => {
    it('404 COMMUNITY_NOT_FOUND が返ること', async () => {
      const response = await request(app)
        .get('/communities/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body.code).toBe('COMMUNITY_NOT_FOUND');
    });
  });

  describe('PRIVATE コミュニティをメンバーが取得する場合', () => {
    it('オーナーは 200 で取得できること', async () => {
      const createRes = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'プライベートコミュニティ', category: 'TECH', visibility: 'PRIVATE' })
        .expect(201);

      const communityId = createRes.body.community.id as string;

      const response = await request(app)
        .get(`/communities/${communityId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.community.id).toBe(communityId);
    });
  });

  describe('PRIVATE コミュニティを非メンバーが取得する場合', () => {
    it('404 が返ること', async () => {
      const createRes = await request(app)
        .post('/communities')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '非公開コミュニティ', category: 'TECH', visibility: 'PRIVATE' })
        .expect(201);

      const communityId = createRes.body.community.id as string;

      // 別のユーザーとして取得
      const otherToken = await アカウントを登録してトークンを取得する(app, {
        name: '別のユーザー',
        email: 'other@example.com',
        password: 'password123',
      });

      const response = await request(app)
        .get(`/communities/${communityId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);

      expect(response.body.code).toBe('COMMUNITY_NOT_FOUND');
    });
  });
});
