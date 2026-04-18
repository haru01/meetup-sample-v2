import { randomUUID } from 'node:crypto';
import { ok, err, type Result } from '@shared/result';
import { ParticipationStatus } from './schemas/participation.schema';
import type { Participation, ParticipationId } from './schemas/participation.schema';
import type { ParticipationInvalidStatusError } from '../errors/participation-errors';

export type { Participation, ParticipationId } from './schemas/participation.schema';
export { ParticipationSchema } from './schemas/participation.schema';

/**
 * ParticipationIdを生成する
 */
export function createParticipationId(id?: string): ParticipationId {
  return (id ?? randomUUID()) as ParticipationId;
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
  if (p.status !== ParticipationStatus.APPLIED && p.status !== ParticipationStatus.APPROVED) {
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
