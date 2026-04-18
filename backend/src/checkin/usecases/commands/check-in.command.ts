import { randomUUID } from 'node:crypto';
import { ok, err, type Result } from '@shared/result';
import { AccountIdSchema, EventIdSchema } from '@shared/schemas/common';
import type { ParticipationRepository } from '@participation/repositories/participation.repository';
import { ParticipationStatus } from '@participation/models/schemas/participation.schema';
import type { CheckIn } from '../../models/checkin';
import { CheckInIdSchema } from '../../models/schemas/checkin.schema';
import { createCheckIn } from '../../models/checkin';
import type { CheckInRepository } from '../../repositories/checkin.repository';
import type {
  CheckInAlreadyExistsError,
  ParticipationNotApprovedError,
  ParticipationNotFoundError,
  UnauthorizedError,
} from '../../errors/checkin-errors';

// ============================================================
// チェックインコマンド
// ============================================================

export interface CheckInInput {
  readonly eventId: string;
  readonly requesterId: string;
}

export type CheckInCommand = (
  input: CheckInInput
) => Promise<
  Result<
    CheckIn,
    | ParticipationNotFoundError
    | ParticipationNotApprovedError
    | CheckInAlreadyExistsError
    | UnauthorizedError
  >
>;

/**
 * チェックインユースケース
 *
 * APPROVED な Participation に対してのみチェックインを許可する。
 * 同一 Participation への重複チェックインはアプリレベルで拒否する。
 */
export function createCheckInCommand(
  participationRepository: ParticipationRepository,
  checkInRepository: CheckInRepository
): CheckInCommand {
  return async ({ eventId, requesterId }) => {
    const parsedEventId = EventIdSchema.parse(eventId);
    const parsedRequesterId = AccountIdSchema.parse(requesterId);

    const participation = await participationRepository.findByEventAndAccount(
      parsedEventId,
      parsedRequesterId
    );

    if (!participation) {
      return err({ type: 'ParticipationNotFound' });
    }

    if (participation.status !== ParticipationStatus.APPROVED) {
      return err({ type: 'ParticipationNotApproved' });
    }

    const existing = await checkInRepository.findByParticipationId(participation.id);
    if (existing) {
      return err({ type: 'CheckInAlreadyExists' });
    }

    const checkin = createCheckIn({
      id: CheckInIdSchema.parse(randomUUID()),
      participationId: participation.id,
      eventId: participation.eventId,
      accountId: participation.accountId,
      checkedInAt: new Date(),
    });

    await checkInRepository.save(checkin);

    return ok(checkin);
  };
}
