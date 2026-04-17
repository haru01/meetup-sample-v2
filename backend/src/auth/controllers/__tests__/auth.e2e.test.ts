import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../../app';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearAuthTables,
} from '../../../infrastructure/test-helper';

// ============================================================
// POST /auth/register E2E テスト
// ============================================================

describe('POST /auth/register', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  const 有効な登録データ = {
    name: 'テストユーザー',
    email: 'test@example.com',
    password: 'password123',
  };

  describe('有効な登録データが与えられた場合', () => {
    it('201 が返り、アカウント情報（passwordHash なし）が含まれること', async () => {
      const response = await request(app).post('/auth/register').send(有効な登録データ).expect(201);

      expect(response.body.token).toBeDefined();
      expect(response.body.account).toMatchObject({
        name: 'テストユーザー',
        email: 'test@example.com',
      });
      expect(response.body.account.id).toBeDefined();
      expect(response.body.account.createdAt).toBeDefined();
      // passwordHash がレスポンスに含まれないこと
      expect(response.body.account.passwordHash).toBeUndefined();
      expect(response.body.account.password).toBeUndefined();

      // DB検証：パスワードがハッシュ化されていること
      const savedAccount = await prisma.account.findUnique({
        where: { id: response.body.account.id },
      });
      expect(savedAccount).not.toBeNull();
      expect(savedAccount?.email).toBe('test@example.com');
      expect(savedAccount?.passwordHash).not.toBe('password123');
    });
  });

  describe('既に登録済みのメールアドレスが与えられた場合', () => {
    it('409 DUPLICATE_EMAIL が返ること', async () => {
      await request(app).post('/auth/register').send(有効な登録データ).expect(201);

      const response = await request(app)
        .post('/auth/register')
        .send({ ...有効な登録データ, name: '別のユーザー' })
        .expect(409);

      expect(response.body.code).toBe('DUPLICATE_EMAIL');
    });
  });

  describe('メールアドレスが不正な形式の場合', () => {
    it('400 が返ること', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ ...有効な登録データ, email: 'invalid-email' })
        .expect(400);

      expect(response.body.code).toBeDefined();
    });
  });

  describe('name が未指定の場合', () => {
    it('400 が返ること', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(400);

      expect(response.body.code).toBeDefined();
    });
  });
});

// ============================================================
// POST /auth/login E2E テスト
// ============================================================

describe('POST /auth/login', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    app = createApp(prisma);
  });

  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  const 登録データ = {
    name: 'ログインテスト',
    email: 'login@example.com',
    password: 'password123',
  };

  async function アカウントを登録する(): Promise<string> {
    const res = await request(app).post('/auth/register').send(登録データ).expect(201);
    return res.body.account.id as string;
  }

  describe('正しいメールアドレスとパスワードの場合', () => {
    it('200 が返り、JWT トークンが含まれること', async () => {
      await アカウントを登録する();

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 登録データ.email, password: 登録データ.password })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });
  });

  describe('存在しないメールアドレスの場合', () => {
    it('401 INVALID_CREDENTIALS が返ること', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('パスワードが不一致の場合', () => {
    it('401 INVALID_CREDENTIALS が返ること', async () => {
      await アカウントを登録する();

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 登録データ.email, password: 'wrongpassword' })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('メールアドレスが不正な形式の場合', () => {
    it('400 が返ること', async () => {
      await request(app)
        .post('/auth/login')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);
    });
  });
});
