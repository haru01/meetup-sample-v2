import { z } from 'zod';

// ============================================================
// 参加ステータススキーマ
// ============================================================

export const ParticipationStatusSchema = z.enum([
  'APPLIED',
  'APPROVED',
  'WAITLISTED',
  'CANCELLED',
]);
export type ParticipationStatus = z.infer<typeof ParticipationStatusSchema>;

/** 参加ステータス定数（スキーマから導出） */
export const ParticipationStatus = ParticipationStatusSchema.enum;
