import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '@shared/middleware/auth.middleware';
import type { Event } from '../models/event';
import type { EventFormat } from '../models/schemas/event.schema';
import type { PublishEventCommand } from '../usecases/commands/publish-event.command';
import type { UpdateEventCommand } from '../usecases/commands/update-event.command';
import type { CloseEventCommand } from '../usecases/commands/close-event.command';
import type { CancelEventCommand } from '../usecases/commands/cancel-event.command';
import type { ListPublishedEventsQuery } from '../usecases/queries/list-published-events.query';
import type { GetEventQuery } from '../usecases/queries/get-event.query';
import {
  mapPublishEventErrorToResponse,
  mapUpdateEventErrorToResponse,
  mapCloseEventErrorToResponse,
  mapCancelEventErrorToResponse,
} from './event-error-mappings';

// ============================================================
// イベントルーター依存性
// ============================================================

export interface EventRouterDependencies {
  readonly listPublishedEventsQuery: ListPublishedEventsQuery;
  readonly getEventQuery: GetEventQuery;
  readonly publishEventCommand: PublishEventCommand;
  readonly updateEventCommand: UpdateEventCommand;
  readonly closeEventCommand: CloseEventCommand;
  readonly cancelEventCommand: CancelEventCommand;
}

// ============================================================
// イベントレスポンス変換
// ============================================================

function toEventResponse(event: Event): Record<string, unknown> {
  return {
    id: event.id,
    communityId: event.communityId,
    createdBy: event.createdBy,
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

// ============================================================
// イベントルーターファクトリ
// ============================================================

// eslint-disable-next-line max-lines-per-function
export function createEventRouter(deps: EventRouterDependencies): Router {
  const router = Router();

  const {
    listPublishedEventsQuery,
    publishEventCommand,
    updateEventCommand,
    closeEventCommand,
    cancelEventCommand,
  } = deps;

  /**
   * GET /events — 公開済みイベント一覧
   */
  router.get('/', async (_req: Request, res: Response): Promise<void> => {
    const events = await listPublishedEventsQuery();
    res.status(200).json({ events: events.map(toEventResponse) });
  });

  /**
   * GET /events/:id — イベント詳細（全ステータス対象）
   */
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const result = await deps.getEventQuery(req.params['id'] as string);
    if (!result.ok) {
      res.status(404).json({ code: 'EVENT_NOT_FOUND', message: 'Event not found' });
      return;
    }
    res.status(200).json({ event: toEventResponse(result.value) });
  });

  /**
   * PUT /events/:id/publish — イベント公開
   */
  router.put(
    '/:id/publish',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      const result = await publishEventCommand({
        eventId: req.params['id'] as string,
        requesterId: req.accountId as string,
      });
      if (!result.ok) {
        const { status, response } = mapPublishEventErrorToResponse(result.error);
        res.status(status).json(response);
        return;
      }
      res.status(200).json({ event: toEventResponse(result.value) });
    }
  );

  /**
   * PATCH /events/:id — イベント編集
   */
  router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      title?: string;
      description?: string | null;
      startsAt?: string;
      endsAt?: string;
      format?: EventFormat;
      capacity?: number;
    };

    const result = await updateEventCommand({
      eventId: req.params['id'] as string,
      requesterId: req.accountId as string,
      updates: {
        title: body.title,
        description: body.description,
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        format: body.format,
        capacity: body.capacity,
      },
    });
    if (!result.ok) {
      const { status, response } = mapUpdateEventErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }
    res.status(200).json({ event: toEventResponse(result.value) });
  });

  /**
   * POST /events/:id/close — イベントクローズ
   */
  router.post('/:id/close', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const result = await closeEventCommand({
      eventId: req.params['id'] as string,
      requesterId: req.accountId as string,
    });
    if (!result.ok) {
      const { status, response } = mapCloseEventErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }
    res.status(200).json({ event: toEventResponse(result.value) });
  });

  /**
   * POST /events/:id/cancel — イベント中止
   */
  router.post('/:id/cancel', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const result = await cancelEventCommand({
      eventId: req.params['id'] as string,
      requesterId: req.accountId as string,
    });
    if (!result.ok) {
      const { status, response } = mapCancelEventErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }
    res.status(200).json({ event: toEventResponse(result.value) });
  });

  return router;
}
