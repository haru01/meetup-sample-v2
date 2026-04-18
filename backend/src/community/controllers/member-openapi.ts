import { z } from 'zod';
import { registry, UuidSchema, ErrorResponseSchema } from '@shared/openapi/registry';

// ============================================================
// Member OpenAPI スキーマ定義
// ============================================================

const MemberResponseSchema = z
  .object({
    id: UuidSchema.openapi({ description: 'メンバーID' }),
    communityId: UuidSchema.openapi({ description: 'コミュニティID' }),
    accountId: UuidSchema.openapi({ description: 'アカウントID' }),
    role: z
      .enum(['OWNER', 'ADMIN', 'MEMBER'])
      .openapi({ description: 'ロール', example: 'MEMBER' }),
    status: z.enum(['PENDING', 'ACTIVE']).openapi({ description: 'ステータス', example: 'ACTIVE' }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('MemberResponse');

// 一覧レスポンスでは accountId を optional にする。
// ACTIVE メンバー以外の requester には accountId を返さないため。
const MemberReadSchema = MemberResponseSchema.omit({ accountId: true })
  .extend({
    accountId: UuidSchema.optional().openapi({
      description: 'アカウントID（ACTIVE メンバーのみ閲覧可能）',
    }),
    accountName: z.string().openapi({ description: 'アカウント名', example: '山田太郎' }),
  })
  .openapi('MemberRead');

const MemberListResponseSchema = z
  .object({
    members: z.array(MemberReadSchema).openapi({ description: 'メンバー一覧' }),
    total: z.number().int().openapi({ description: '総件数', example: 10 }),
  })
  .openapi('MemberListResponse');

// ============================================================
// スキーマ登録
// ============================================================

registry.register('MemberResponse', MemberResponseSchema);
registry.register('MemberRead', MemberReadSchema);
registry.register('MemberListResponse', MemberListResponseSchema);

// ============================================================
// Member API パス定義
// ============================================================

// POST /communities/:id/members — コミュニティ参加
registry.registerPath({
  method: 'post',
  path: '/communities/{id}/members',
  tags: ['Members'],
  summary: 'コミュニティに参加する',
  description: 'PUBLIC コミュニティは ACTIVE、PRIVATE コミュニティは PENDING で参加します。',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: UuidSchema.openapi({ description: 'コミュニティID' }),
    }),
  },
  responses: {
    201: {
      description: '参加成功',
      content: { 'application/json': { schema: MemberResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'コミュニティが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: '既に参加済み',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// DELETE /communities/:id/members/me — コミュニティ脱退
registry.registerPath({
  method: 'delete',
  path: '/communities/{id}/members/me',
  tags: ['Members'],
  summary: 'コミュニティを脱退する',
  description: 'コミュニティから脱退します。オーナーは脱退できません。',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: UuidSchema.openapi({ description: 'コミュニティID' }),
    }),
  },
  responses: {
    200: {
      description: '脱退成功',
      content: { 'application/json': { schema: z.object({}) } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'コミュニティまたはメンバーが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    422: {
      description: 'オーナーは脱退不可',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// DELETE /communities/:id/members/:memberId — メンバーID指定でコミュニティ脱退
registry.registerPath({
  method: 'delete',
  path: '/communities/{id}/members/{memberId}',
  tags: ['Members'],
  summary: 'メンバーID指定でコミュニティを脱退する',
  description: 'メンバーIDを指定してコミュニティから脱退します。オーナーは脱退できません。',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: UuidSchema.openapi({ description: 'コミュニティID' }),
      memberId: UuidSchema.openapi({ description: 'メンバーID' }),
    }),
  },
  responses: {
    200: {
      description: '脱退成功',
      content: { 'application/json': { schema: z.object({}) } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'コミュニティまたはメンバーが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    422: {
      description: 'オーナーは脱退不可',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// GET /communities/:id/members — メンバー一覧
registry.registerPath({
  method: 'get',
  path: '/communities/{id}/members',
  tags: ['Members'],
  summary: 'メンバー一覧を取得する',
  description:
    'コミュニティのアクティブメンバー一覧をページネーションで返します。未ログインでも参照可能です。',
  request: {
    params: z.object({
      id: UuidSchema.openapi({ description: 'コミュニティID' }),
    }),
    query: z.object({
      limit: z.coerce
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .openapi({ description: '取得件数（デフォルト: 20、上限: 100）', example: 20 }),
      offset: z.coerce
        .number()
        .int()
        .min(0)
        .optional()
        .openapi({ description: 'オフセット（デフォルト: 0）', example: 0 }),
    }),
  },
  responses: {
    200: {
      description: 'メンバー一覧取得成功',
      content: { 'application/json': { schema: MemberListResponseSchema } },
    },
    404: {
      description: 'コミュニティが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /communities/:id/members/:memberId/approve — メンバー承認
registry.registerPath({
  method: 'patch',
  path: '/communities/{id}/members/{memberId}/approve',
  tags: ['Members'],
  summary: 'メンバーを承認する',
  description: 'OWNER または ADMIN のみが PENDING メンバーを ACTIVE に承認できます。',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: UuidSchema.openapi({ description: 'コミュニティID' }),
      memberId: UuidSchema.openapi({ description: 'メンバーID' }),
    }),
  },
  responses: {
    200: {
      description: '承認成功',
      content: { 'application/json': { schema: MemberResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: '権限なし',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'コミュニティまたはメンバーが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /communities/:id/members/:memberId/reject — メンバー拒否
registry.registerPath({
  method: 'patch',
  path: '/communities/{id}/members/{memberId}/reject',
  tags: ['Members'],
  summary: 'メンバーを拒否する',
  description: 'OWNER または ADMIN のみが PENDING メンバーを拒否できます。',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: UuidSchema.openapi({ description: 'コミュニティID' }),
      memberId: UuidSchema.openapi({ description: 'メンバーID' }),
    }),
  },
  responses: {
    204: {
      description: '拒否成功',
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: '権限なし',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'コミュニティまたはメンバーが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
