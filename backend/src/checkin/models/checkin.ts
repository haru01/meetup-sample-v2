import type { AccountId, EventId } from '@shared/schemas/common';
import type { ParticipationId } from '@/participation/models/schemas/participation.schema';
import type { CheckIn, CheckInId } from './schemas/checkin.schema';

// ============================================================
// CheckIn エンティティ（schemas から再エクスポート）
// ============================================================

export type { CheckIn, CheckInId } from './schemas/checkin.schema';
export { CheckInSchema, CheckInIdSchema } from './schemas/checkin.schema';

// ============================================================
// CheckIn ファクトリ入力
// ============================================================

export interface CreateCheckInInput {
  readonly id: CheckInId;
  readonly participationId: ParticipationId;
  readonly eventId: EventId;
  readonly accountId: AccountId;
  readonly checkedInAt: Date;
}

/**
 * CheckIn を生成する（ファクトリ関数）
 */
export function createCheckIn(input: CreateCheckInInput): CheckIn {
  return {
    id: input.id,
    participationId: input.participationId,
    eventId: input.eventId,
    accountId: input.accountId,
    checkedInAt: input.checkedInAt,
  };
}
