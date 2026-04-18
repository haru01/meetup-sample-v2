import { z } from 'zod';
import { AccountIdSchema, EventIdSchema } from '@shared/schemas/common';
import { ParticipationIdSchema } from '@/participation/models/schemas/participation.schema';

// ============================================================
// CheckInId スキーマ（Zod Branded Type）
// ============================================================

export const CheckInIdSchema = z.string().uuid().brand<'CheckInId'>();
export type CheckInId = z.infer<typeof CheckInIdSchema>;

// ============================================================
// CheckIn 集約スキーマ
// ============================================================

export const CheckInSchema = z.object({
  id: CheckInIdSchema,
  participationId: ParticipationIdSchema,
  eventId: EventIdSchema,
  accountId: AccountIdSchema,
  checkedInAt: z.date(),
});
export type CheckIn = z.infer<typeof CheckInSchema>;
