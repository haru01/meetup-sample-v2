import { z } from 'zod';

// ============================================================
// CheckInId スキーマ（Branded Type）
// ============================================================

export const CheckInIdSchema = z.string().uuid();
export type CheckInId = string & { readonly __brand: 'CheckInId' };

// ============================================================
// CheckIn 集約スキーマ
// ============================================================

export const CheckInSchema = z.object({
  id: z.custom<CheckInId>((v) => typeof v === 'string'),
  participationId: z.string(),
  eventId: z.string(),
  accountId: z.string(),
  checkedInAt: z.date(),
});
export type CheckIn = z.infer<typeof CheckInSchema>;
