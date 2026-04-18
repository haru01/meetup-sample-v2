import { z } from 'zod';
import {
  AccountIdSchema,
  EventIdSchema,
  type AccountId,
  type EventId,
} from '@shared/schemas/common';

// ============================================================
// ParticipationId スキーマ（Zod Branded Type）
// ============================================================

export const ParticipationIdSchema = z.string().uuid().brand<'ParticipationId'>();
export type ParticipationId = z.infer<typeof ParticipationIdSchema>;

// ============================================================
// 参加ステータススキーマ
// ============================================================

export const ParticipationStatusSchema = z.enum(['APPLIED', 'APPROVED', 'WAITLISTED', 'CANCELLED']);
export type ParticipationStatus = z.infer<typeof ParticipationStatusSchema>;

/** 参加ステータス定数（スキーマから導出） */
export const ParticipationStatus = ParticipationStatusSchema.enum;

// ============================================================
// 参加集約スキーマ
// ============================================================

export const ParticipationSchema = z.object({
  id: ParticipationIdSchema,
  eventId: EventIdSchema,
  accountId: AccountIdSchema,
  status: ParticipationStatusSchema,
  appliedAt: z.date(),
  updatedAt: z.date(),
});
export type Participation = z.infer<typeof ParticipationSchema>;

export type { AccountId, EventId };
