import type { PrismaClient } from '@prisma/client';
import { ok, type Result } from '@shared/result';
import type { Participation } from '../../models/participation';
import type { ParticipationId } from '../../models/participation';

export type ParticipationWithEvent = Participation & {
  eventTitle: string;
  eventStartsAt: Date;
};

export type GetMyParticipationsQuery = (
  accountId: string
) => Promise<Result<ParticipationWithEvent[], never>>;

export function createGetMyParticipationsQuery(prisma: PrismaClient): GetMyParticipationsQuery {
  return async (accountId) => {
    const rows = await prisma.participation.findMany({
      where: { accountId },
      include: { event: { select: { title: true, startsAt: true } } },
      orderBy: { appliedAt: 'desc' },
    });

    const list: ParticipationWithEvent[] = rows.map((r) => ({
      id: r.id as ParticipationId,
      eventId: r.eventId,
      accountId: r.accountId,
      status: r.status as Participation['status'],
      appliedAt: r.appliedAt,
      updatedAt: r.updatedAt,
      eventTitle: r.event.title,
      eventStartsAt: r.event.startsAt,
    }));

    return ok(list);
  };
}
