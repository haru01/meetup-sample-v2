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

const EventSchema = z
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
    status: EventStatusSchema.openapi({ description: 'ステータス', example: 'PUBLISHED' }),
    createdAt: z.string().datetime().openapi({ example: '2026-01-15T10:30:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2026-01-15T10:30:00.000Z' }),
  })
  .openapi('EventPublic');

const EventResponseSchema = z
  .object({
    event: EventSchema,
  })
  .openapi('EventPublicResponse');

const ListEventsResponseSchema = z
  .object({
    events: z.array(EventSchema),
  })
  .openapi('ListEventsResponse');

const UpdateEventRequestSchema = z
  .object({
    title: EventTitleSchema.optional().openapi({ description: 'タイトル' }),
    description: EventDescriptionSchema.optional().openapi({ description: '説明' }),
    startsAt: z.string().datetime().optional().openapi({ description: '開始日時' }),
    endsAt: z.string().datetime().optional().openapi({ description: '終了日時' }),
    format: EventFormatSchema.optional().openapi({ description: '開催形式' }),
    capacity: EventCapacitySchema.optional().openapi({ description: '定員' }),
  })
  .openapi('UpdateEventRequest');

// ============================================================
// スキーマ登録
// ============================================================

registry.register('EventPublicResponse', EventResponseSchema);
registry.register('ListEventsResponse', ListEventsResponseSchema);
registry.register('UpdateEventRequest', UpdateEventRequestSchema);

// ============================================================
// Event API パス定義
// ============================================================

// GET /events
registry.registerPath({
  method: 'get',
  path: '/events',
  tags: ['Events'],
  summary: '公開済みイベント一覧を取得する',
  description: '公開(PUBLISHED)状態のイベント一覧を取得します。',
  responses: {
    200: {
      description: 'イベント一覧取得成功',
      content: { 'application/json': { schema: ListEventsResponseSchema } },
    },
  },
});

// GET /events/:id
registry.registerPath({
  method: 'get',
  path: '/events/{id}',
  tags: ['Events'],
  summary: 'イベント詳細を取得する',
  request: {
    params: z.object({ id: UuidSchema.openapi({ description: 'イベントID' }) }),
  },
  responses: {
    200: {
      description: 'イベント詳細取得成功',
      content: { 'application/json': { schema: EventResponseSchema } },
    },
    404: {
      description: 'イベントが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// PUT /events/:id/publish
registry.registerPath({
  method: 'put',
  path: '/events/{id}/publish',
  tags: ['Events'],
  summary: 'イベントを公開する',
  description: 'DRAFT 状態のイベントを PUBLISHED に遷移させます。作成者のみ操作可能です。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: UuidSchema.openapi({ description: 'イベントID' }) }),
  },
  responses: {
    200: {
      description: '公開成功',
      content: { 'application/json': { schema: EventResponseSchema } },
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
      description: 'イベントが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: '状態不整合',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// PATCH /events/:id
registry.registerPath({
  method: 'patch',
  path: '/events/{id}',
  tags: ['Events'],
  summary: 'イベントを編集する',
  description: 'DRAFT または PUBLISHED 状態のイベントを編集します。作成者のみ操作可能です。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: UuidSchema.openapi({ description: 'イベントID' }) }),
    body: {
      content: { 'application/json': { schema: UpdateEventRequestSchema } },
    },
  },
  responses: {
    200: {
      description: '編集成功',
      content: { 'application/json': { schema: EventResponseSchema } },
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
      description: 'イベントが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: '状態不整合',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /events/:id/close
registry.registerPath({
  method: 'post',
  path: '/events/{id}/close',
  tags: ['Events'],
  summary: 'イベントをクローズする',
  description: 'PUBLISHED 状態のイベントを CLOSED に遷移させます。作成者のみ操作可能です。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: UuidSchema.openapi({ description: 'イベントID' }) }),
  },
  responses: {
    200: {
      description: 'クローズ成功',
      content: { 'application/json': { schema: EventResponseSchema } },
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
      description: 'イベントが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: '状態不整合',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /events/:id/cancel
registry.registerPath({
  method: 'post',
  path: '/events/{id}/cancel',
  tags: ['Events'],
  summary: 'イベントを中止する',
  description: 'PUBLISHED 状態のイベントを CANCELLED に遷移させます。作成者のみ操作可能です。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: UuidSchema.openapi({ description: 'イベントID' }) }),
  },
  responses: {
    200: {
      description: '中止成功',
      content: { 'application/json': { schema: EventResponseSchema } },
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
      description: 'イベントが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: '状態不整合',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// POST /scheduler/send-reminders
registry.registerPath({
  method: 'post',
  path: '/scheduler/send-reminders',
  tags: ['System'],
  summary: 'リマインダー送信バッチ',
  description:
    '現在時刻+20h〜+28h に開始する PUBLISHED イベントに対して EventDateApproached を発行します。X-Scheduler-Secret ヘッダーが必要です。',
  request: {
    headers: z.object({
      'x-scheduler-secret': z.string().openapi({ description: 'スケジューラー秘密鍵' }),
    }),
  },
  responses: {
    200: {
      description: 'リマインダー発行成功',
      content: {
        'application/json': {
          schema: z.object({ processed: z.number().int() }).openapi('SchedulerResult'),
        },
      },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
