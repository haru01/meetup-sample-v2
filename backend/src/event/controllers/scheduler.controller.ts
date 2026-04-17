import { Router } from 'express';
import type { Request, Response } from 'express';
import type { SendRemindersCommand } from '../usecases/commands/send-reminders.command';

// ============================================================
// スケジューラールーターファクトリ
// ============================================================

export interface SchedulerRouterDependencies {
  readonly sendRemindersCommand: SendRemindersCommand;
}

const REMINDER_WINDOW_START_HOURS = 20;
const REMINDER_WINDOW_END_HOURS = 28;

export function createSchedulerRouter(deps: SchedulerRouterDependencies): Router {
  const router = Router();

  /**
   * POST /scheduler/send-reminders
   * ヘッダー X-Scheduler-Secret を検証し、SendRemindersCommand を実行する。
   */
  router.post('/send-reminders', async (req: Request, res: Response): Promise<void> => {
    const secret = process.env['SCHEDULER_SECRET'] ?? '';
    const provided = req.headers['x-scheduler-secret'];
    if (!secret || provided !== secret) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid scheduler secret' });
      return;
    }

    const result = await deps.sendRemindersCommand({
      now: new Date(),
      windowStartHours: REMINDER_WINDOW_START_HOURS,
      windowEndHours: REMINDER_WINDOW_END_HOURS,
    });

    res.status(200).json(result);
  });

  return router;
}
