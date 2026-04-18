import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { EventRepository } from '../../repositories/event.repository';

// ============================================================
// 開催日接近検知コマンド
// ============================================================

export interface CheckUpcomingEventsInput {
  readonly now: Date;
  readonly windowStartHours: number;
  readonly windowEndHours: number;
}

export interface CheckUpcomingEventsResult {
  readonly detected: number;
}

export type CheckUpcomingEventsCommand = (
  input: CheckUpcomingEventsInput
) => Promise<CheckUpcomingEventsResult>;

/**
 * 開催日接近検知バッチユースケース
 *
 * now + windowStartHours 〜 now + windowEndHours に startsAt がある PUBLISHED
 * イベントを取得し、各イベントに対し EventDateApproached を publish する。
 * 実際のリマインダー通知は event/composition の SendReminder ポリシーが行う。
 */
export function createCheckUpcomingEventsCommand(
  eventRepository: EventRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): CheckUpcomingEventsCommand {
  return async ({ now, windowStartHours, windowEndHours }) => {
    const from = new Date(now.getTime() + windowStartHours * 60 * 60 * 1000);
    const to = new Date(now.getTime() + windowEndHours * 60 * 60 * 1000);

    const events = await eventRepository.findUpcoming(from, to);

    for (const event of events) {
      await eventBus.publish({ type: 'EventDateApproached', eventId: event.id });
    }

    return { detected: events.length };
  };
}
