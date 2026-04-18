import { Router } from 'express';
import type { Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';
import { requireAuth, optionalAuth } from '@shared/middleware/auth.middleware';
import { createEventId } from '@shared/schemas/id-factories';
import type { AccountId, CommunityId } from '@shared/schemas/common';
import type { RequestHandler } from 'express';
import type { Event } from '../models/event';
import type { EventFormat } from '../models/schemas/event.schema';
import type { CreateEventCommand } from '../usecases/commands/create-event.command';
import { mapCreateEventErrorToResponse } from './event-error-mappings';

export interface CommunityEventRouterDependencies {
  readonly createEventCommand: CreateEventCommand;
  readonly requireCommunityRole: RequestHandler;
  readonly prisma: PrismaClient;
}

function toEventResponse(event: Event): Record<string, unknown> {
  return {
    id: event.id,
    communityId: event.communityId,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    format: event.format,
    capacity: event.capacity,
    status: event.status,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function buildListCommunityEventsWhere(
  communityId: string,
  accountId: string | undefined
): { communityId: string; OR?: Array<Record<string, unknown>>; status?: { not: 'DRAFT' } } {
  if (accountId) {
    return {
      communityId,
      OR: [{ status: { not: 'DRAFT' } }, { createdBy: accountId }],
    };
  }
  return { communityId, status: { not: 'DRAFT' } };
}

function listCommunityEventsHandler(prisma: PrismaClient) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const communityId = req.params['id'] as string;
      const accountId = req.accountId;
      const limit = typeof req.query['limit'] === 'number' ? req.query['limit'] : 20;
      const offset = typeof req.query['offset'] === 'number' ? req.query['offset'] : 0;
      const where = buildListCommunityEventsWhere(communityId, accountId);

      const [rows, total] = await prisma.$transaction([
        prisma.event.findMany({
          where,
          orderBy: { startsAt: 'asc' },
          take: limit,
          skip: offset,
        }),
        prisma.event.count({ where }),
      ]);

      res.status(200).json({
        events: rows.map((r) => ({
          id: r.id,
          communityId: r.communityId,
          title: r.title,
          status: r.status,
          startsAt: r.startsAt.toISOString(),
          endsAt: r.endsAt.toISOString(),
          format: r.format,
          capacity: r.capacity,
        })),
        total,
      });
    } catch (err) {
      console.error('[GET /communities/:id/events] Error:', err);
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  };
}

function createCommunityEventHandler(createEventCommand: CreateEventCommand) {
  return async (req: Request, res: Response): Promise<void> => {
    const now = new Date();
    const result = await createEventCommand({
      id: createEventId(),
      communityId: req.params['id'] as CommunityId,
      createdBy: req.accountId as AccountId,
      title: req.body.title as string,
      description: (req.body.description as string | null | undefined) ?? null,
      startsAt: new Date(req.body.startsAt as string),
      endsAt: new Date(req.body.endsAt as string),
      format: req.body.format as EventFormat,
      capacity: req.body.capacity as number,
      now,
      createdAt: now,
      updatedAt: now,
    });

    if (!result.ok) {
      const { status, response } = mapCreateEventErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(201).json({ event: toEventResponse(result.value) });
  };
}

export function createCommunityEventRouter(deps: CommunityEventRouterDependencies): Router {
  const router = Router({ mergeParams: true });
  router.get('/', optionalAuth, listCommunityEventsHandler(deps.prisma));
  router.post(
    '/',
    requireAuth,
    deps.requireCommunityRole,
    createCommunityEventHandler(deps.createEventCommand)
  );
  return router;
}
