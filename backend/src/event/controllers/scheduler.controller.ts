import { Router } from 'express';
import type { Request, Response } from 'express';
import type { CheckUpcomingEventsCommand } from '../usecases/commands/check-upcoming-events.command';

// ============================================================
// スケジューラールーターファクトリ
// ============================================================

export interface SchedulerRouterDependencies {
  readonly checkUpcomingEventsCommand: CheckUpcomingEventsCommand;
}

const REMINDER_WINDOW_START_HOURS = 20;
const REMINDER_WINDOW_END_HOURS = 28;

export function createSchedulerRouter(deps: SchedulerRouterDependencies): Router {
  const router = Router();

  /**
   * POST /scheduler/send-reminders
   * ヘッダー X-Scheduler-Secret を検証し、CheckUpcomingEventsCommand を実行する。
   * REST パスは後方互換のため据置。レスポンス body は { detected: number } を返す。
   */
  router.post('/send-reminders', async (req: Request, res: Response): Promise<void> => {
    const secret = process.env['SCHEDULER_SECRET'] ?? '';
    const provided = req.headers['x-scheduler-secret'];
    if (!secret || provided !== secret) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid scheduler secret' });
      return;
    }

    const result = await deps.checkUpcomingEventsCommand({
      now: new Date(),
      windowStartHours: REMINDER_WINDOW_START_HOURS,
      windowEndHours: REMINDER_WINDOW_END_HOURS,
    });

    res.status(200).json(result);
  });

  return router;
}
