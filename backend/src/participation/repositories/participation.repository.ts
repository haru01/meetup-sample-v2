import type { AccountId, EventId } from '@shared/schemas/common';
import type { Participation, ParticipationId } from '../models/participation';

// ============================================================
// ParticipationRepository インターフェース
// ============================================================

export interface ParticipationRepository {
  findById(id: ParticipationId): Promise<Participation | null>;
  findByEventAndAccount(eventId: EventId, accountId: AccountId): Promise<Participation | null>;
  findAppliedByEvent(eventId: EventId): Promise<Participation[]>;
  findApprovedByEvent(eventId: EventId): Promise<Participation[]>;
  findActiveByEvent(eventId: EventId): Promise<Participation[]>;
  countApproved(eventId: EventId): Promise<number>;
  findFirstWaitlisted(eventId: EventId): Promise<Participation | null>;
  findByAccount(accountId: AccountId): Promise<Participation[]>;
  save(participation: Participation): Promise<void>;
  saveAll(participations: Participation[]): Promise<void>;

  /**
   * AutoWaitlistIfFull ポリシーを同一トランザクション内で適用する。
   * initial を保存し、APPROVED 件数が capacity を超えていればただちに WAITLISTED に更新する。
   * トランザクションの境界は実装側 (PrismaParticipationRepository) に閉じ込める。
   */
  applyWithCapacityCheck(initial: Participation, capacity: number): Promise<Participation>;
}
