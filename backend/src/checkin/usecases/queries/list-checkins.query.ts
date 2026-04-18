import type { PrismaClient } from '@prisma/client';
import { ok, err, type Result } from '@shared/result';
import { AccountIdSchema, EventIdSchema } from '@shared/schemas/common';
import type { CheckIn } from '../../models/checkin';
import type { CheckInRepository } from '../../repositories/checkin.repository';
import type { UnauthorizedError } from '../../errors/checkin-errors';

// ============================================================
// チェックイン一覧取得クエリ
// ============================================================

export interface ListCheckInsInput {
  readonly eventId: string;
  readonly requesterId: string;
}

export type ListCheckInsResult = {
  readonly checkins: CheckIn[];
};

export type ListCheckInsQuery = (
  input: ListCheckInsInput
) => Promise<Result<ListCheckInsResult, UnauthorizedError>>;

/**
 * チェックイン一覧取得ユースケース
 *
 * イベント作成者（createdBy）のみ閲覧可能。
 */
export function createListCheckInsQuery(
  prisma: PrismaClient,
  checkInRepository: CheckInRepository
): ListCheckInsQuery {
  return async ({ eventId, requesterId }) => {
    const parsedEventId = EventIdSchema.parse(eventId);
    const parsedRequesterId = AccountIdSchema.parse(requesterId);

    const event = await prisma.event.findUnique({ where: { id: parsedEventId } });
    if (!event || event.createdBy !== parsedRequesterId) {
      return err({ type: 'Unauthorized' });
    }

    const checkins = await checkInRepository.findByEvent(parsedEventId);
    return ok({ checkins });
  };
}
