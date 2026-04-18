import type { CheckIn, CheckInId } from './schemas/checkin.schema';

// ============================================================
// CheckIn エンティティ（schemas から再エクスポート）
// ============================================================

export type { CheckIn, CheckInId } from './schemas/checkin.schema';
export { CheckInSchema } from './schemas/checkin.schema';

// ============================================================
// CheckIn ファクトリ入力
// ============================================================

export interface CreateCheckInInput {
  readonly id: CheckInId;
  readonly participationId: string;
  readonly eventId: string;
  readonly accountId: string;
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
