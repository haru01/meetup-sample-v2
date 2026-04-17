import type { Participation, ParticipationId } from '../models/participation';

// ============================================================
// ParticipationRepository インターフェース
// ============================================================

export interface ParticipationRepository {
  findById(id: ParticipationId): Promise<Participation | null>;
  findByEventAndAccount(eventId: string, accountId: string): Promise<Participation | null>;
  findAppliedByEvent(eventId: string): Promise<Participation[]>;
  findApprovedByEvent(eventId: string): Promise<Participation[]>;
  findActiveByEvent(eventId: string): Promise<Participation[]>;
  countApproved(eventId: string): Promise<number>;
  findFirstWaitlisted(eventId: string): Promise<Participation | null>;
  findByAccount(accountId: string): Promise<Participation[]>;
  save(participation: Participation): Promise<void>;
  saveAll(participations: Participation[]): Promise<void>;
}
