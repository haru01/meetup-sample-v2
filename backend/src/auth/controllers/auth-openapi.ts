import { z } from 'zod';
import { registry, UuidSchema, ErrorResponseSchema } from '@shared/openapi/registry';
import {
  RegisterEmailSchema,
  RegisterNameSchema,
  RegisterPasswordSchema,
} from '../models/schemas/account.schema';

// ============================================================
// Auth OpenAPI スキーマ定義
// ============================================================

const RegisterRequestSchema = z
  .object({
    name: RegisterNameSchema.openapi({ description: '表示名', example: '山田太郎' }),
    email: RegisterEmailSchema.openapi({
      description: 'メールアドレス',
      example: 'user@example.com',
    }),
    password: RegisterPasswordSchema.openapi({
      description: 'パスワード',
      example: 'password123',
    }),
  })
  .openapi('RegisterRequest');

const RegisterResponseSchema = z
  .object({
    id: UuidSchema.openapi({ description: 'アカウントID' }),
    name: z.string().openapi({ example: '山田太郎' }),
    email: RegisterEmailSchema.openapi({ example: 'user@example.com' }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('RegisterResponse');

const LoginRequestSchema = z
  .object({
    email: RegisterEmailSchema.openapi({
      description: 'メールアドレス',
      example: 'user@example.com',
    }),
    password: RegisterPasswordSchema.openapi({
      description: 'パスワード',
      example: 'password123',
    }),
  })
  .openapi('LoginRequest');

const LoginResponseSchema = z
  .object({
    token: z
      .string()
      .openapi({ description: 'JWTアクセストークン', example: 'eyJhbGciOiJIUzI1NiIs...' }),
  })
  .openapi('LoginResponse');

const AccountSchema = z
  .object({
    id: UuidSchema.openapi({ description: 'アカウントID' }),
    name: z.string().openapi({ example: '山田太郎' }),
    email: RegisterEmailSchema.openapi({ example: 'user@example.com' }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('Account');

const MeResponseSchema = z.object({ account: AccountSchema }).openapi('MeResponse');

// ============================================================
// スキーマ登録
// ============================================================

registry.register('RegisterRequest', RegisterRequestSchema);
registry.register('RegisterResponse', RegisterResponseSchema);
registry.register('LoginRequest', LoginRequestSchema);
registry.register('LoginResponse', LoginResponseSchema);
registry.register('Account', AccountSchema);
registry.register('MeResponse', MeResponseSchema);

// ============================================================
// Auth API パス定義
// ============================================================

// POST /auth/register - アカウント登録
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  tags: ['Auth'],
  summary: 'アカウントを登録する',
  description: '新しいアカウントを登録します。',
  request: {
    body: {
      content: {
        'application/json': { schema: RegisterRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'アカウント登録成功',
      content: { 'application/json': { schema: RegisterResponseSchema } },
    },
    400: {
      description: 'バリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'メールアドレス重複',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /auth/login - ログイン
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'ログインする',
  description: 'メールアドレスとパスワードでログインし、JWTトークンを取得します。',
  request: {
    body: {
      content: {
        'application/json': { schema: LoginRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'ログイン成功',
      content: { 'application/json': { schema: LoginResponseSchema } },
    },
    400: {
      description: 'バリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: '認証失敗',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// GET /auth/me - 現在のアカウント情報取得
registry.registerPath({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: '現在のアカウント情報を取得する',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: 'アカウント情報取得成功',
      content: { 'application/json': { schema: MeResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'アカウントが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
