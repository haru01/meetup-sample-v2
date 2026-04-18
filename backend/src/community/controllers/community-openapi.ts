import { z } from 'zod';
import { registry, UuidSchema, ErrorResponseSchema } from '@shared/openapi/registry';
import {
  CommunityCategorySchema,
  CommunityVisibilitySchema,
  CommunityNameSchema,
  CommunityDescriptionSchema,
} from '../models/schemas/community.schema';

// ============================================================
// Community OpenAPI スキーマ定義
// ============================================================

const CommunityDtoSchema = z
  .object({
    id: UuidSchema.openapi({ description: 'コミュニティID' }),
    name: CommunityNameSchema.openapi({
      description: 'コミュニティ名',
      example: 'TypeScript勉強会',
    }),
    description: CommunityDescriptionSchema.openapi({
      description: '説明',
      example: 'TypeScriptを学ぶコミュニティです',
    }),
    category: CommunityCategorySchema.openapi({ description: 'カテゴリ', example: 'TECH' }),
    visibility: CommunityVisibilitySchema.openapi({ description: '公開設定', example: 'PUBLIC' }),
    createdAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2024-01-15T10:30:00.000Z' }),
  })
  .openapi('Community');

const CommunityResponseSchema = z
  .object({
    community: CommunityDtoSchema,
  })
  .openapi('CommunityResponse');

const CreateCommunityRequestSchema = z
  .object({
    name: CommunityNameSchema.openapi({
      description: 'コミュニティ名',
      example: 'TypeScript勉強会',
    }),
    description: CommunityDescriptionSchema.optional().openapi({
      description: '説明',
      example: 'TypeScriptを学ぶコミュニティです',
    }),
    category: CommunityCategorySchema.openapi({ description: 'カテゴリ', example: 'TECH' }),
    visibility: CommunityVisibilitySchema.openapi({ description: '公開設定', example: 'PUBLIC' }),
  })
  .openapi('CreateCommunityRequest');

const ListCommunitiesResponseSchema = z
  .object({
    communities: z.array(CommunityDtoSchema),
    total: z.number().int().openapi({ description: '総件数', example: 42 }),
  })
  .openapi('ListCommunitiesResponse');

// ============================================================
// スキーマ登録
// ============================================================

registry.register('CommunityResponse', CommunityResponseSchema);
registry.register('CreateCommunityRequest', CreateCommunityRequestSchema);
registry.register('ListCommunitiesResponse', ListCommunitiesResponseSchema);

// ============================================================
// Community API パス定義
// ============================================================

// POST /communities - コミュニティ作成
registry.registerPath({
  method: 'post',
  path: '/communities',
  tags: ['Communities'],
  summary: 'コミュニティを作成する',
  description: '新しいコミュニティを作成します。認証が必要です。',
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateCommunityRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'コミュニティ作成成功',
      content: { 'application/json': { schema: CommunityResponseSchema } },
    },
    400: {
      description: 'バリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: 'コミュニティ名重複',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    422: {
      description: 'コミュニティ数上限',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// GET /communities - コミュニティ一覧取得
registry.registerPath({
  method: 'get',
  path: '/communities',
  tags: ['Communities'],
  summary: 'コミュニティ一覧を取得する',
  description:
    'コミュニティの一覧を取得します。?member=me で自分が所属するコミュニティのみ取得できます（認証必要）。',
  request: {
    query: z.object({
      category: CommunityCategorySchema.optional().openapi({ description: 'カテゴリフィルター' }),
      member: z.literal('me').optional().openapi({ description: '自分のコミュニティのみ取得' }),
      limit: z
        .string()
        .optional()
        .openapi({ description: '取得件数（デフォルト: 20）', example: '20' }),
      offset: z
        .string()
        .optional()
        .openapi({ description: 'オフセット（デフォルト: 0）', example: '0' }),
    }),
  },
  responses: {
    200: {
      description: 'コミュニティ一覧取得成功',
      content: { 'application/json': { schema: ListCommunitiesResponseSchema } },
    },
    401: {
      description: '認証エラー（?member=me 使用時）',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// GET /communities/:id - コミュニティ取得
registry.registerPath({
  method: 'get',
  path: '/communities/{id}',
  tags: ['Communities'],
  summary: 'コミュニティを取得する',
  description:
    '指定したIDのコミュニティを取得します。PRIVATE コミュニティはメンバーのみ閲覧可能です。',
  request: {
    params: z.object({
      id: UuidSchema.openapi({ description: 'コミュニティID' }),
    }),
  },
  responses: {
    200: {
      description: 'コミュニティ取得成功',
      content: { 'application/json': { schema: CommunityResponseSchema } },
    },
    404: {
      description: 'コミュニティが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
