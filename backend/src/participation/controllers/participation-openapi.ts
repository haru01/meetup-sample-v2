import { z } from 'zod';
import { registry, UuidSchema, ErrorResponseSchema } from '@shared/openapi/registry';
import { ParticipationStatusSchema } from '../models/schemas/participation.schema';

// ============================================================
// Participation OpenAPI スキーマ定義
// ============================================================

const ParticipationSchema = z
  .object({
    id: UuidSchema.openapi({ description: '参加ID' }),
    eventId: UuidSchema.openapi({ description: 'イベントID' }),
    accountId: UuidSchema.openapi({ description: 'アカウントID' }),
    status: ParticipationStatusSchema.openapi({
      description: '参加ステータス',
      example: 'APPLIED',
    }),
    appliedAt: z.string().datetime().openapi({ example: '2026-06-01T10:00:00.000Z' }),
    updatedAt: z.string().datetime().openapi({ example: '2026-06-01T10:00:00.000Z' }),
  })
  .openapi('Participation');

const ParticipationResponseSchema = z
  .object({ participation: ParticipationSchema })
  .openapi('ParticipationResponse');

const ParticipationListResponseSchema = z
  .object({ participations: z.array(ParticipationSchema) })
  .openapi('ParticipationListResponse');

const ApproveParticipationsRequestSchema = z
  .object({
    participationIds: z
      .array(UuidSchema)
      .optional()
      .openapi({ description: '承認対象の参加ID（省略時は全 APPLIED を一括承認）' }),
  })
  .openapi('ApproveParticipationsRequest');

const RemainingCapacitySchema = z
  .object({
    eventId: UuidSchema,
    capacity: z.number().int().openapi({ example: 50 }),
    approved: z.number().int().openapi({ example: 20 }),
    remaining: z.number().int().openapi({ example: 30 }),
  })
  .openapi('RemainingCapacity');

registry.register('ParticipationResponse', ParticipationResponseSchema);
registry.register('ParticipationListResponse', ParticipationListResponseSchema);
registry.register('ApproveParticipationsRequest', ApproveParticipationsRequestSchema);
registry.register('RemainingCapacity', RemainingCapacitySchema);

// ============================================================
// Paths
// ============================================================

registry.registerPath({
  method: 'post',
  path: '/events/{id}/participations',
  tags: ['Participations'],
  summary: 'イベントに参加申込する',
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: UuidSchema }) },
  responses: {
    201: {
      description: '申込成功',
      content: { 'application/json': { schema: ParticipationResponseSchema } },
    },
    401: { description: '認証エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'イベントが見つからない', content: { 'application/json': { schema: ErrorResponseSchema } } },
    409: { description: '重複申込', content: { 'application/json': { schema: ErrorResponseSchema } } },
    422: { description: '公開されていない', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/events/{id}/participations',
  tags: ['Participations'],
  summary: '参加申込一覧（主催者）',
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: UuidSchema }) },
  responses: {
    200: {
      description: '申込一覧',
      content: { 'application/json': { schema: ParticipationListResponseSchema } },
    },
    401: { description: '認証エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: '権限エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'イベントが見つからない', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'post',
  path: '/events/{id}/participations/approve',
  tags: ['Participations'],
  summary: '参加申込を一括承認する',
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: UuidSchema }),
    body: { content: { 'application/json': { schema: ApproveParticipationsRequestSchema } } },
  },
  responses: {
    200: {
      description: '承認結果',
      content: { 'application/json': { schema: ParticipationListResponseSchema } },
    },
    401: { description: '認証エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: '権限エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: '見つからない', content: { 'application/json': { schema: ErrorResponseSchema } } },
    422: { description: 'ステータス不正', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/participations/{id}',
  tags: ['Participations'],
  summary: '参加申込をキャンセルする（本人）',
  security: [{ BearerAuth: [] }],
  request: { params: z.object({ id: UuidSchema }) },
  responses: {
    200: {
      description: 'キャンセル成功',
      content: { 'application/json': { schema: ParticipationResponseSchema } },
    },
    401: { description: '認証エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: '権限エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: '見つからない', content: { 'application/json': { schema: ErrorResponseSchema } } },
    422: { description: 'ステータス不正', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/events/{id}/capacity',
  tags: ['Participations'],
  summary: 'イベントの残席数を取得する',
  request: { params: z.object({ id: UuidSchema }) },
  responses: {
    200: {
      description: '残席情報',
      content: { 'application/json': { schema: RemainingCapacitySchema } },
    },
    404: { description: 'イベントが見つからない', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

registry.registerPath({
  method: 'get',
  path: '/participations/my',
  tags: ['Participations'],
  summary: '自分の参加履歴を取得する',
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: '参加履歴',
      content: { 'application/json': { schema: ParticipationListResponseSchema } },
    },
    401: { description: '認証エラー', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});
