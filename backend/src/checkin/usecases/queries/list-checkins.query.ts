import type { PrismaClient } from '@prisma/client';
import { ok, err, type Result } from '@shared/result';
import { parseAccountId, parseEventId } from '@shared/schemas/id-factories';
import type { CheckIn } from '../../models/checkin';
import type { CheckInRepository } from '../../repositories/checkin.repository';
import type { ListCheckInsError } from '../../errors/checkin-errors';

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
) => Promise<Result<ListCheckInsResult, ListCheckInsError>>;

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
    const parsedEventIdResult = parseEventId(eventId, 'eventId');
    if (!parsedEventIdResult.ok) return parsedEventIdResult;
    const parsedRequesterIdResult = parseAccountId(requesterId, 'requesterId');
    if (!parsedRequesterIdResult.ok) return parsedRequesterIdResult;
    const parsedEventId = parsedEventIdResult.value;
    const parsedRequesterId = parsedRequesterIdResult.value;

    const event = await prisma.event.findUnique({ where: { id: parsedEventId } });
    if (!event || event.createdBy !== parsedRequesterId) {
      return err({ type: 'Unauthorized' });
    }

    const checkins = await checkInRepository.findByEvent(parsedEventId);
    return ok({ checkins });
  };
}
