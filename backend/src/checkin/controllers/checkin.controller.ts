import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '@shared/middleware/auth.middleware';
import type { CheckIn } from '../models/checkin';
import type { CheckInCommand } from '../usecases/commands/check-in.command';
import type { ListCheckInsQuery } from '../usecases/queries/list-checkins.query';
import {
  mapCheckInErrorToResponse,
  mapListCheckInsErrorToResponse,
} from './checkin-error-mappings';

// ============================================================
// CheckIn レスポンス変換
// ============================================================

function toCheckInResponse(checkin: CheckIn): Record<string, unknown> {
  return {
    id: checkin.id,
    participationId: checkin.participationId,
    eventId: checkin.eventId,
    accountId: checkin.accountId,
    checkedInAt: checkin.checkedInAt.toISOString(),
  };
}

// ============================================================
// CheckIn ルーターファクトリ
// ============================================================

export interface CheckInRouterDependencies {
  readonly checkInCommand: CheckInCommand;
  readonly listCheckInsQuery: ListCheckInsQuery;
}

/**
 * CheckIn ルーターを作成する（/events/:id/checkins にマウント想定）
 */
export function createCheckInRouter(deps: CheckInRouterDependencies): Router {
  const router = Router({ mergeParams: true });

  const { checkInCommand, listCheckInsQuery } = deps;

  /**
   * POST /events/:id/checkins — チェックイン（参加者本人）
   */
  router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const result = await checkInCommand({
      eventId: req.params['id'] as string,
      requesterId: req.accountId as string,
    });

    if (!result.ok) {
      const { status, response } = mapCheckInErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(201).json({ checkin: toCheckInResponse(result.value) });
  });

  /**
   * GET /events/:id/checkins — チェックイン一覧（作成者のみ）
   */
  router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const result = await listCheckInsQuery({
      eventId: req.params['id'] as string,
      requesterId: req.accountId as string,
    });

    if (!result.ok) {
      const { status, response } = mapListCheckInsErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.json({
      checkins: result.value.checkins.map((c) => toCheckInResponse(c)),
    });
  });

  return router;
}
