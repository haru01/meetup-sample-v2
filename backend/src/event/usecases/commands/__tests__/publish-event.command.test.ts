import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus } from '@shared/event-bus';
import { createPublishEventCommand } from '../publish-event.command';
import type { PublishEventInput } from '../publish-event.command';
import type { EventRepository } from '../../../repositories/event.repository';
import type { Event } from '../../../models/event';
import { EventStatus } from '../../../models/schemas/event.schema';
import type { EventDomainEvent } from '../../../errors/event-errors';
import { testEventId, testCommunityId, testAccountId } from '@shared/testing/test-ids';

const eventId = testEventId('event-1');
const communityId = testCommunityId('community-1');
const createdBy = testAccountId('account-1');
const publisher = testAccountId('account-2');
const occurredAt = new Date('2026-04-20T10:00:00Z');

const makeDraftEvent = (): Event => ({
  id: eventId,
  communityId,
  createdBy,
  title: 'テストイベント',
  description: null,
  startsAt: new Date('2026-06-01T10:00:00Z'),
  endsAt: new Date('2026-06-01T12:00:00Z'),
  format: 'ONLINE',
  capacity: 50,
  status: EventStatus.DRAFT,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

const makeInput = (): PublishEventInput => ({
  communityId,
  eventId,
  publishedBy: publisher,
  occurredAt,
});

const makeEventRepository = (event: Event | null): EventRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  findById: vi.fn().mockResolvedValue(event),
  findByStatus: vi.fn().mockResolvedValue([]),
  findUpcoming: vi.fn().mockResolvedValue([]),
});

describe('PublishEventCommand', () => {
  let eventRepo: EventRepository;
  let eventBus: InMemoryEventBus<EventDomainEvent>;
  let useCase: ReturnType<typeof createPublishEventCommand>;

  beforeEach(() => {
    eventRepo = makeEventRepository(makeDraftEvent());
    eventBus = new InMemoryEventBus<EventDomainEvent>();
    useCase = createPublishEventCommand(eventRepo, eventBus);
  });

  describe('正常系', () => {
    it('DRAFTのイベントを公開するとPUBLISHEDに遷移する', async () => {
      const result = await useCase(makeInput());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(eventId);
        expect(result.value.status).toBe(EventStatus.PUBLISHED);
        expect(result.value.updatedAt).toEqual(occurredAt);
      }
    });

    it('公開後のイベントをリポジトリに保存する', async () => {
      await useCase(makeInput());

      expect(eventRepo.save).toHaveBeenCalledTimes(1);
      const saved = vi.mocked(eventRepo.save).mock.calls[0]?.[0];
      expect(saved?.status).toBe(EventStatus.PUBLISHED);
    });

    it('公開成功時にEventPublishedイベントを発火する', async () => {
      const handler = vi.fn();
      eventBus.subscribe('EventPublished', handler);

      await useCase(makeInput());

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EventPublished',
          eventId,
          communityId,
          publishedBy: publisher,
          occurredAt,
        })
      );
    });
  });

  describe('異常系', () => {
    it('イベントが存在しない場合EventNotFoundエラーを返す', async () => {
      eventRepo = makeEventRepository(null);
      useCase = createPublishEventCommand(eventRepo, eventBus);

      const result = await useCase(makeInput());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventNotFound');
      }
    });

    it('他コミュニティのイベントを指定した場合EventNotFoundエラーを返す', async () => {
      const otherCommunityId = testCommunityId('community-2');
      eventRepo = makeEventRepository({ ...makeDraftEvent(), communityId: otherCommunityId });
      useCase = createPublishEventCommand(eventRepo, eventBus);

      const result = await useCase(makeInput());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventNotFound');
      }
      expect(eventRepo.save).not.toHaveBeenCalled();
    });

    it('PUBLISHEDのイベントを公開するとEventAlreadyPublishedエラーを返す', async () => {
      eventRepo = makeEventRepository({ ...makeDraftEvent(), status: EventStatus.PUBLISHED });
      useCase = createPublishEventCommand(eventRepo, eventBus);

      const result = await useCase(makeInput());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventAlreadyPublished');
      }
    });

    it('CLOSEDのイベントを公開するとEventAlreadyPublishedエラーを返す', async () => {
      eventRepo = makeEventRepository({ ...makeDraftEvent(), status: EventStatus.CLOSED });
      useCase = createPublishEventCommand(eventRepo, eventBus);

      const result = await useCase(makeInput());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventAlreadyPublished');
      }
    });

    it('CANCELLEDのイベントを公開するとEventAlreadyPublishedエラーを返す', async () => {
      eventRepo = makeEventRepository({ ...makeDraftEvent(), status: EventStatus.CANCELLED });
      useCase = createPublishEventCommand(eventRepo, eventBus);

      const result = await useCase(makeInput());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventAlreadyPublished');
      }
    });

    it('異常系ではEventPublishedイベントを発火しない', async () => {
      eventRepo = makeEventRepository({ ...makeDraftEvent(), status: EventStatus.PUBLISHED });
      useCase = createPublishEventCommand(eventRepo, eventBus);
      const handler = vi.fn();
      eventBus.subscribe('EventPublished', handler);

      await useCase(makeInput());

      expect(handler).not.toHaveBeenCalled();
    });

    it('異常系ではリポジトリに保存しない', async () => {
      eventRepo = makeEventRepository({ ...makeDraftEvent(), status: EventStatus.PUBLISHED });
      useCase = createPublishEventCommand(eventRepo, eventBus);

      await useCase(makeInput());

      expect(eventRepo.save).not.toHaveBeenCalled();
    });
  });
});
