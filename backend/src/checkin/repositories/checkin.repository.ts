import type { CheckIn } from '../models/checkin';

// ============================================================
// CheckInRepository インターフェース
// ============================================================

export interface CheckInRepository {
  /**
   * 参加申し込みIDからチェックインを取得
   */
  findByParticipationId(participationId: string): Promise<CheckIn | null>;

  /**
   * イベントIDに紐づくチェックイン一覧を取得
   */
  findByEvent(eventId: string): Promise<CheckIn[]>;

  /**
   * チェックインを保存（insert）
   */
  save(checkin: CheckIn): Promise<void>;
}
