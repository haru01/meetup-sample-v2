import { Router } from 'express';
import type { Request, Response } from 'express';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { EventRepository } from '../repositories/event.repository';

// ============================================================
// スケジューラールーターファクトリ
// ============================================================

export interface SchedulerDependencies {
  readonly eventRepository: EventRepository;
  readonly eventBus: InMemoryEventBus<MeetupDomainEvent>;
}

const REMINDER_WINDOW_START_HOURS = 20;
const REMINDER_WINDOW_END_HOURS = 28;

export function createSchedulerRouter(deps: SchedulerDependencies): Router {
  const router = Router();

  /**
   * POST /scheduler/send-reminders
   * ヘッダー X-Scheduler-Secret を検証し、
   * 現在時刻+20h〜+28h に startsAt がある PUBLISHED イベントに対して
   * EventDateApproached を publish する。
   */
  router.post('/send-reminders', async (req: Request, res: Response): Promise<void> => {
    const secret = process.env['SCHEDULER_SECRET'] ?? '';
    const provided = req.headers['x-scheduler-secret'];
    if (!secret || provided !== secret) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid scheduler secret' });
      return;
    }

    const now = new Date();
    const from = new Date(now.getTime() + REMINDER_WINDOW_START_HOURS * 60 * 60 * 1000);
    const to = new Date(now.getTime() + REMINDER_WINDOW_END_HOURS * 60 * 60 * 1000);

    const events = await deps.eventRepository.findUpcoming(from, to);

    for (const event of events) {
      await deps.eventBus.publish({ type: 'EventDateApproached', eventId: event.id });
    }

    res.status(200).json({ processed: events.length });
  });

  return router;
}
