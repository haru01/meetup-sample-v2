import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth, optionalAuth } from '@shared/middleware/auth.middleware';
import type { Participation, ParticipationId } from '../models/participation';
import type { ApplyForEventCommand } from '../usecases/commands/apply-for-event.command';
import type { ApproveParticipationsCommand } from '../usecases/commands/approve-participations.command';
import type { CancelParticipationCommand } from '../usecases/commands/cancel-participation.command';
import type { GetApplicationListQuery } from '../usecases/queries/get-application-list.query';
import type { GetRemainingCapacityQuery } from '../usecases/queries/get-remaining-capacity.query';
import type { GetMyParticipationsQuery } from '../usecases/queries/get-my-participations.query';
import {
  mapApplyForEventErrorToResponse,
  mapApproveParticipationsErrorToResponse,
  mapCancelParticipationErrorToResponse,
  mapGetApplicationListErrorToResponse,
  mapGetRemainingCapacityErrorToResponse,
} from './participation-error-mappings';

// ============================================================
// ルーター依存性定義（composition への逆参照を避けるためローカル定義）
// ============================================================

export interface ParticipationRouterDependencies {
  readonly applyForEventCommand: ApplyForEventCommand;
  readonly approveParticipationsCommand: ApproveParticipationsCommand;
  readonly getApplicationListQuery: GetApplicationListQuery;
  readonly getRemainingCapacityQuery: GetRemainingCapacityQuery;
}

export interface ParticipationSelfRouterDependencies {
  readonly cancelParticipationCommand: CancelParticipationCommand;
  readonly getMyParticipationsQuery: GetMyParticipationsQuery;
}

// ============================================================
// レスポンス変換
// ============================================================

function toParticipationResponse(p: Participation): Record<string, unknown> {
  return {
    id: p.id,
    eventId: p.eventId,
    accountId: p.accountId,
    status: p.status,
    appliedAt: p.appliedAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ============================================================
// ルーターファクトリ
// ============================================================

/**
 * /events/:id 配下にマウントする想定のルーター。
 * POST /events/:id/participations
 * GET  /events/:id/participations
 * POST /events/:id/participations/approve
 * GET  /events/:id/capacity
 */
export function createParticipationRouter(deps: ParticipationRouterDependencies): Router {
  const router = Router({ mergeParams: true });

  router.post(
    '/:id/participations',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      const result = await deps.applyForEventCommand({
        eventId: req.params['id'] as string,
        accountId: req.accountId as string,
      });
      if (!result.ok) {
        const { status, response } = mapApplyForEventErrorToResponse(result.error);
        res.status(status).json(response);
        return;
      }
      res.status(201).json({ participation: toParticipationResponse(result.value) });
    }
  );

  router.get(
    '/:id/participations',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      const result = await deps.getApplicationListQuery({
        eventId: req.params['id'] as string,
        requesterId: req.accountId as string,
      });
      if (!result.ok) {
        const { status, response } = mapGetApplicationListErrorToResponse(result.error);
        res.status(status).json(response);
        return;
      }
      res.status(200).json({
        participations: result.value.map((p) => ({
          ...toParticipationResponse(p),
          accountName: 'accountName' in p ? (p as { accountName: string }).accountName : undefined,
        })),
      });
    }
  );

  router.post(
    '/:id/participations/approve',
    requireAuth,
    async (req: Request, res: Response): Promise<void> => {
      const rawIds = req.body?.participationIds as string[] | undefined;
      const participationIds = rawIds?.map((id) => id as ParticipationId);
      const result = await deps.approveParticipationsCommand({
        eventId: req.params['id'] as string,
        requesterId: req.accountId as string,
        participationIds,
      });
      if (!result.ok) {
        const { status, response } = mapApproveParticipationsErrorToResponse(result.error);
        res.status(status).json(response);
        return;
      }
      res.status(200).json({ approved: result.value.length });
    }
  );

  router.get('/:id/capacity', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    const result = await deps.getRemainingCapacityQuery(req.params['id'] as string);
    if (!result.ok) {
      const { status, response } = mapGetRemainingCapacityErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }
    res.status(200).json(result.value);
  });

  return router;
}

/**
 * /participations/... 配下の本人操作用ルーター。
 * DELETE /participations/:id
 * GET    /participations/my
 */
export function createParticipationSelfRouter(deps: ParticipationSelfRouterDependencies): Router {
  const router = Router();

  router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const result = await deps.cancelParticipationCommand({
      participationId: req.params['id'] as ParticipationId,
      requesterId: req.accountId as string,
    });
    if (!result.ok) {
      const { status, response } = mapCancelParticipationErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }
    res.status(200).json({ participation: toParticipationResponse(result.value) });
  });

  router.get('/my', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const result = await deps.getMyParticipationsQuery(req.accountId as string);
    if (!result.ok) {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal error' });
      return;
    }
    res.status(200).json({
      participations: result.value.map((p) => ({
        ...toParticipationResponse(p),
        eventTitle: 'eventTitle' in p ? (p as { eventTitle: string }).eventTitle : undefined,
        eventStartsAt:
          'eventStartsAt' in p ? (p as { eventStartsAt: Date }).eventStartsAt : undefined,
      })),
    });
  });

  return router;
}
