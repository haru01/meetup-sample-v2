import type { PrismaClient } from '@prisma/client';
import { ok, err, type Result } from '@shared/result';
import { EventIdSchema } from '@shared/schemas/common';
import type { ParticipationRepository } from '../../repositories/participation.repository';
import type { GetRemainingCapacityError } from '../../errors/participation-errors';

// ============================================================
// 残席数クエリ
// ============================================================

export interface GetRemainingCapacityOutput {
  readonly eventId: string;
  readonly capacity: number;
  readonly approved: number;
  readonly remaining: number;
}

export type GetRemainingCapacityQuery = (
  eventId: string
) => Promise<Result<GetRemainingCapacityOutput, GetRemainingCapacityError>>;

/**
 * イベントの残席数（capacity - approved）を返す。
 */
export function createGetRemainingCapacityQuery(
  prisma: PrismaClient,
  participationRepository: ParticipationRepository
): GetRemainingCapacityQuery {
  return async (eventId) => {
    const parsedEventId = EventIdSchema.parse(eventId);
    const event = await prisma.event.findUnique({
      where: { id: parsedEventId },
      select: { id: true, capacity: true },
    });
    if (!event) {
      return err({ type: 'EventNotFound' });
    }
    const approved = await participationRepository.countApproved(parsedEventId);
    const remaining = Math.max(0, event.capacity - approved);
    return ok({ eventId, capacity: event.capacity, approved, remaining });
  };
}
