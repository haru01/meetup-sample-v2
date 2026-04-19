import { z } from 'zod';
import { registry, UuidSchema, ErrorResponseSchema } from '@shared/openapi/registry';
import {
  EventTitleSchema,
  EventDescriptionSchema,
  EventFormatSchema,
  EventStatusSchema,
  EventCapacitySchema,
} from '../models/schemas/event.schema';

// ============================================================
// Event OpenAPI スキーマ定義
// ============================================================

const EventDtoSchema = z
  .object({
    id: UuidSchema.openapi({ description: 'イベントID' }),
    communityId: UuidSchema.openapi({ description: 'コミュニティID' }),
    createdBy: UuidSchema.openapi({ description: '作成者アカウントID' }),
    title: EventTitleSchema.openapi({ description: 'タイトル', example: 'TypeScript もくもく会' }),
    description: EventDescriptionSchema.openapi({
      description: '説明',
      example: 'TypeScriptでもくもくプログラミングする会です',
    }),
    startsAt: z
      .string()
      .datetime()
      .openapi({ description: '開始日時', example: '2026-07-01T19:00:00.000Z' }),
    endsAt: z
      .string()
      .datetime()
      .openapi({ description: '終了日時', example: '2026-07-01T21:00:00.000Z' }),
    format: EventFormatSchema.openapi({ description: '開催形式', example: 'ONLINE' }),
    capacity: EventCapacitySchema.openapi({ description: '定員', example: 50 }),
    status: EventStatusSchema.openapi({ description: 'ステータス', example: 'DRAFT' }),
    createdAt: z.string().datetime().openapi({ example: '2026-01-15T10:30:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2026-01-15T10:30:00.000Z' }),
  })
  .openapi('EventPublic');

const EventResponseSchema = z
  .object({
    event: EventDtoSchema,
  })
  .openapi('EventPublicResponse');

const ListCommunityEventsResponseSchema = z
  .object({
    events: z.array(EventDtoSchema),
    total: z.number().int().openapi({ description: '総件数', example: 10 }),
  })
  .openapi('ListCommunityEventsResponse');

const CreateEventRequestSchema = z
  .object({
    title: EventTitleSchema.openapi({ description: 'タイトル', example: 'TypeScript もくもく会' }),
    description: EventDescriptionSchema.optional().openapi({
      description: '説明',
      example: 'TypeScriptでもくもくプログラミングする会です',
    }),
    startsAt: z
      .string()
      .datetime()
      .openapi({ description: '開始日時', example: '2026-07-01T19:00:00.000Z' }),
    endsAt: z
      .string()
      .datetime()
      .openapi({ description: '終了日時', example: '2026-07-01T21:00:00.000Z' }),
    format: EventFormatSchema.openapi({ description: '開催形式', example: 'ONLINE' }),
    capacity: EventCapacitySchema.openapi({ description: '定員', example: 50 }),
  })
  .openapi('CreateEventRequest');

// ============================================================
// スキーマ登録
// ============================================================

registry.register('EventPublicResponse', EventResponseSchema);
registry.register('ListCommunityEventsResponse', ListCommunityEventsResponseSchema);
registry.register('CreateEventRequest', CreateEventRequestSchema);

// ============================================================
// Event API パス定義
// ============================================================

// GET /communities/{communityId}/events - コミュニティのイベント一覧
registry.registerPath({
  method: 'get',
  path: '/communities/{communityId}/events',
  tags: ['Events'],
  summary: 'コミュニティのイベント一覧を取得する',
  description:
    'コミュニティのイベントをページネーションで返します。DRAFT は作成者のみ参照可能です。',
  request: {
    params: z.object({
      communityId: UuidSchema.openapi({ description: 'コミュニティID' }),
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
      description: 'イベント一覧',
      content: { 'application/json': { schema: ListCommunityEventsResponseSchema } },
    },
    400: {
      description: 'クエリバリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /communities/{communityId}/events - イベント作成（DRAFT）
registry.registerPath({
  method: 'post',
  path: '/communities/{communityId}/events',
  tags: ['Events'],
  summary: 'イベントを作成する',
  description: 'コミュニティ内にイベントを作成します。オーナーまたは管理者のみ操作可能です。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      communityId: UuidSchema.openapi({ description: 'コミュニティID' }),
    }),
    body: {
      content: {
        'application/json': { schema: CreateEventRequestSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'イベント作成成功',
      content: { 'application/json': { schema: EventResponseSchema } },
    },
    400: {
      description: 'バリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: '権限エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: 'コミュニティが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    422: {
      description: '日時バリデーションエラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
