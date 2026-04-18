import type { PrismaClient } from '@prisma/client';
import { ok, err, type Result } from '@shared/result';
import type { AccountId, EventId } from '@shared/schemas/common';
import type { Participation, ParticipationId } from '../../models/participation';
import type { GetApplicationListError } from '../../errors/participation-errors';

export interface GetApplicationListInput {
  readonly eventId: string;
  readonly requesterId: string;
}

export type ApplicationListItem = Participation & { accountName: string };

export type GetApplicationListQuery = (
  input: GetApplicationListInput
) => Promise<Result<ApplicationListItem[], GetApplicationListError>>;

export function createGetApplicationListQuery(prisma: PrismaClient): GetApplicationListQuery {
  return async (input) => {
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, createdBy: true },
    });
    if (!event) return err({ type: 'EventNotFound' });
    if (event.createdBy !== input.requesterId) return err({ type: 'Unauthorized' });

    const rows = await prisma.participation.findMany({
      where: { eventId: input.eventId, status: 'APPLIED' },
      include: { account: { select: { name: true } } },
      orderBy: { appliedAt: 'asc' },
    });

    const list: ApplicationListItem[] = rows.map((r) => ({
      id: r.id as ParticipationId,
      eventId: r.eventId as EventId,
      accountId: r.accountId as AccountId,
      status: r.status as Participation['status'],
      appliedAt: r.appliedAt,
      updatedAt: r.updatedAt,
      accountName: r.account.name,
    }));

    return ok(list);
  };
}
