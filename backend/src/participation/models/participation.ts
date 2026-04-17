import { randomUUID } from 'node:crypto';
import { ok, err, type Result } from '@shared/result';
import { ParticipationStatus, type ParticipationStatus as ParticipationStatusType } from './schemas/participation.schema';
import type { ParticipationInvalidStatusError } from '../errors/participation-errors';

// ============================================================
// ブランド型
// ============================================================

export type ParticipationId = string & { readonly __brand: 'ParticipationId' };

/**
 * ParticipationIdを生成する
 */
export function createParticipationId(id?: string): ParticipationId {
  return (id ?? randomUUID()) as ParticipationId;
}

// ============================================================
// 参加エンティティ
// ============================================================

export interface Participation {
  readonly id: ParticipationId;
  readonly eventId: string;
  readonly accountId: string;
  readonly status: ParticipationStatusType;
  readonly appliedAt: Date;
  readonly updatedAt: Date;
}

// ============================================================
// 状態遷移（pure）
// ============================================================

/**
 * APPLIED → APPROVED
 */
export function approveParticipation(
  p: Participation
): Result<Participation, ParticipationInvalidStatusError> {
  if (p.status !== ParticipationStatus.APPLIED) {
    return err({ type: 'ParticipationInvalidStatus', current: p.status });
  }
  return ok({ ...p, status: ParticipationStatus.APPROVED, updatedAt: new Date() });
}

/**
 * APPLIED → WAITLISTED（満員時の自動キャンセル待ち）
 */
export function waitlistParticipation(
  p: Participation
): Result<Participation, ParticipationInvalidStatusError> {
  if (p.status !== ParticipationStatus.APPLIED) {
    return err({ type: 'ParticipationInvalidStatus', current: p.status });
  }
  return ok({ ...p, status: ParticipationStatus.WAITLISTED, updatedAt: new Date() });
}

/**
 * APPLIED | APPROVED → CANCELLED
 */
export function cancelParticipation(
  p: Participation
): Result<Participation, ParticipationInvalidStatusError> {
  if (
    p.status !== ParticipationStatus.APPLIED &&
    p.status !== ParticipationStatus.APPROVED
  ) {
    return err({ type: 'ParticipationInvalidStatus', current: p.status });
  }
  return ok({ ...p, status: ParticipationStatus.CANCELLED, updatedAt: new Date() });
}

/**
 * WAITLISTED → APPROVED
 */
export function promoteFromWaitlist(
  p: Participation
): Result<Participation, ParticipationInvalidStatusError> {
  if (p.status !== ParticipationStatus.WAITLISTED) {
    return err({ type: 'ParticipationInvalidStatus', current: p.status });
  }
  return ok({ ...p, status: ParticipationStatus.APPROVED, updatedAt: new Date() });
}
