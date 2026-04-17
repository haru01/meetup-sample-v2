import type { CheckInId } from './schemas/checkin.schema';

// ============================================================
// CheckIn エンティティ
// ============================================================

export type { CheckInId };

export interface CheckIn {
  readonly id: CheckInId;
  readonly participationId: string;
  readonly eventId: string;
  readonly accountId: string;
  readonly checkedInAt: Date;
}

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
