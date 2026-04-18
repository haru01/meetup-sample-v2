import { randomUUID } from 'node:crypto';
import { ok, err, type Result } from '@shared/result';
import type { InvalidIdFormatError } from '@shared/errors';
import { parseAccountId, parseEventId } from '@shared/schemas/id-factories';
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
    | InvalidIdFormatError
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
    const parsedEventIdResult = parseEventId(eventId, 'eventId');
    if (!parsedEventIdResult.ok) return parsedEventIdResult;
    const parsedRequesterIdResult = parseAccountId(requesterId, 'requesterId');
    if (!parsedRequesterIdResult.ok) return parsedRequesterIdResult;
    const parsedEventId = parsedEventIdResult.value;
    const parsedRequesterId = parsedRequesterIdResult.value;

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
