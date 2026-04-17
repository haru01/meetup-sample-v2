import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import { createSendRemindersCommand } from '../send-reminders.command';
import type { EventRepository } from '../../../repositories/event.repository';
import type { Event } from '../../../models/event';
import { createEventId, createCommunityId, createAccountId } from '@shared/schemas/id-factories';

const now = new Date('2026-06-01T10:00:00Z');

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: createEventId('event-1'),
  communityId: createCommunityId('community-1'),
  createdBy: createAccountId('account-1'),
  title: 'サンプルイベント',
  description: null,
  startsAt: new Date('2026-06-02T10:00:00Z'),
  endsAt: new Date('2026-06-02T12:00:00Z'),
  format: 'ONLINE',
  capacity: 50,
  status: 'PUBLISHED',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const makeEventRepository = (events: Event[]): EventRepository => ({
  findById: vi.fn().mockResolvedValue(null),
  findByStatus: vi.fn().mockResolvedValue([]),
  findUpcoming: vi.fn().mockResolvedValue(events),
  save: vi.fn().mockResolvedValue(undefined),
});

describe('SendRemindersCommand', () => {
  let eventBus: InMemoryEventBus<MeetupDomainEvent>;
  let publishSpy: ReturnType<typeof vi.fn<(event: MeetupDomainEvent) => Promise<void>>>;

  beforeEach(() => {
    eventBus = new InMemoryEventBus<MeetupDomainEvent>();
    publishSpy = vi.fn(async () => {});
    eventBus.subscribe('EventDateApproached', publishSpy);
  });

  describe('正常系', () => {
    it('window 内のイベントを取得し EventDateApproached を発火する', async () => {
      const events = [makeEvent({ id: createEventId('event-1') })];
      const repository = makeEventRepository(events);
      const command = createSendRemindersCommand(repository, eventBus);

      const result = await command({ now, windowStartHours: 20, windowEndHours: 28 });

      expect(result.processed).toBe(1);
      expect(repository.findUpcoming).toHaveBeenCalledWith(
        new Date(now.getTime() + 20 * 60 * 60 * 1000),
        new Date(now.getTime() + 28 * 60 * 60 * 1000)
      );
      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith({
        type: 'EventDateApproached',
        eventId: 'event-1',
      });
    });

    it('複数イベント分の EventDateApproached を発火する', async () => {
      const events = [
        makeEvent({ id: createEventId('event-1') }),
        makeEvent({ id: createEventId('event-2') }),
        makeEvent({ id: createEventId('event-3') }),
      ];
      const repository = makeEventRepository(events);
      const command = createSendRemindersCommand(repository, eventBus);

      const result = await command({ now, windowStartHours: 20, windowEndHours: 28 });

      expect(result.processed).toBe(3);
      expect(publishSpy).toHaveBeenCalledTimes(3);
    });

    it('対象イベントが 0 件の場合は processed: 0 を返す', async () => {
      const repository = makeEventRepository([]);
      const command = createSendRemindersCommand(repository, eventBus);

      const result = await command({ now, windowStartHours: 20, windowEndHours: 28 });

      expect(result.processed).toBe(0);
      expect(publishSpy).not.toHaveBeenCalled();
    });
  });
});
