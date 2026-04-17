import { z } from 'zod';
import { registry, UuidSchema, ErrorResponseSchema } from '@shared/openapi/registry';

// ============================================================
// CheckIn OpenAPI スキーマ定義
// ============================================================

const CheckInSchema = z
  .object({
    id: UuidSchema.openapi({ description: 'チェックインID' }),
    participationId: UuidSchema.openapi({ description: '参加申し込みID' }),
    eventId: UuidSchema.openapi({ description: 'イベントID' }),
    accountId: UuidSchema.openapi({ description: 'アカウントID' }),
    checkedInAt: z
      .string()
      .datetime()
      .openapi({ description: 'チェックイン日時', example: '2026-07-01T19:00:00.000Z' }),
  })
  .openapi('CheckIn');

const CheckInResponseSchema = z
  .object({
    checkin: CheckInSchema,
  })
  .openapi('CheckInResponse');

const CheckInListResponseSchema = z
  .object({
    checkins: z.array(CheckInSchema),
  })
  .openapi('CheckInListResponse');

// ============================================================
// スキーマ登録
// ============================================================

registry.register('CheckInResponse', CheckInResponseSchema);
registry.register('CheckInListResponse', CheckInListResponseSchema);

// ============================================================
// CheckIn API パス定義
// ============================================================

// POST /events/{eventId}/checkins - チェックイン
registry.registerPath({
  method: 'post',
  path: '/events/{eventId}/checkins',
  tags: ['CheckIns'],
  summary: 'イベントにチェックインする',
  description:
    '承認済み（APPROVED）の参加申し込みを持つ参加者本人のみ操作可能。重複チェックインは 409 を返します。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      eventId: UuidSchema.openapi({ description: 'イベントID' }),
    }),
  },
  responses: {
    201: {
      description: 'チェックイン成功',
      content: { 'application/json': { schema: CheckInResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    404: {
      description: '参加申し込みが見つからない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    409: {
      description: '既にチェックイン済み',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    422: {
      description: '参加申し込みが承認されていない',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

// GET /events/{eventId}/checkins - チェックイン一覧
registry.registerPath({
  method: 'get',
  path: '/events/{eventId}/checkins',
  tags: ['CheckIns'],
  summary: 'イベントのチェックイン一覧を取得する',
  description: 'イベント作成者のみ閲覧可能。',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({
      eventId: UuidSchema.openapi({ description: 'イベントID' }),
    }),
  },
  responses: {
    200: {
      description: 'チェックイン一覧取得成功',
      content: { 'application/json': { schema: CheckInListResponseSchema } },
    },
    401: {
      description: '認証エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    403: {
      description: '権限エラー',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});
