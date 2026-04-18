import { z } from 'zod';

// ============================================================
// ブランド型
// ============================================================

export type ParticipationId = string & { readonly __brand: 'ParticipationId' };

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
  id: z.custom<ParticipationId>((v) => typeof v === 'string'),
  eventId: z.string(),
  accountId: z.string(),
  status: ParticipationStatusSchema,
  appliedAt: z.date(),
  updatedAt: z.date(),
});
export type Participation = z.infer<typeof ParticipationSchema>;
