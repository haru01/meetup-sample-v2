import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import { PrismaEventRepository } from './repositories/prisma-event.repository';
import {
  PrismaNotificationRepository,
  type NotificationRepository,
  type NotificationRecord,
} from './repositories/notification.repository';
import {
  createPublishEventCommand,
  type PublishEventCommand,
} from './usecases/commands/publish-event.command';
import {
  createUpdateEventCommand,
  type UpdateEventCommand,
} from './usecases/commands/update-event.command';
import {
  createCloseEventCommand,
  type CloseEventCommand,
} from './usecases/commands/close-event.command';
import {
  createCancelEventCommand,
  type CancelEventCommand,
} from './usecases/commands/cancel-event.command';
import {
  createListPublishedEventsQuery,
  type ListPublishedEventsQuery,
} from './usecases/queries/list-published-events.query';
import {
  createGetEventQuery,
  type GetEventQuery,
} from './usecases/queries/get-event.query';
import { createEventRouter } from './controllers/event.controller';
import { createSchedulerRouter } from './controllers/scheduler.controller';

// ============================================================
// Event コンテキスト 依存性構成
// ============================================================

export interface EventContextDependencies {
  readonly listPublishedEventsQuery: ListPublishedEventsQuery;
  readonly getEventQuery: GetEventQuery;
  readonly publishEventCommand: PublishEventCommand;
  readonly updateEventCommand: UpdateEventCommand;
  readonly closeEventCommand: CloseEventCommand;
  readonly cancelEventCommand: CancelEventCommand;
  readonly eventRouter: Router;
  readonly schedulerRouter: Router;
}

export function createEventDependencies(
  prisma: PrismaClient,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): EventContextDependencies {
  const eventRepository = new PrismaEventRepository(prisma);
  const notificationRepository = new PrismaNotificationRepository(prisma);

  const listPublishedEventsQuery = createListPublishedEventsQuery(eventRepository);
  const getEventQuery = createGetEventQuery(eventRepository);
  const publishEventCommand = createPublishEventCommand(eventRepository, eventBus);
  const updateEventCommand = createUpdateEventCommand(eventRepository);
  const closeEventCommand = createCloseEventCommand(eventRepository, eventBus);
  const cancelEventCommand = createCancelEventCommand(eventRepository, eventBus);

  registerPolicies(prisma, notificationRepository, eventBus);

  const eventRouter = createEventRouter({
    listPublishedEventsQuery,
    getEventQuery,
    publishEventCommand,
    updateEventCommand,
    closeEventCommand,
    cancelEventCommand,
  });
  const schedulerRouter = createSchedulerRouter({ eventRepository, eventBus });

  return {
    listPublishedEventsQuery,
    getEventQuery,
    publishEventCommand,
    updateEventCommand,
    closeEventCommand,
    cancelEventCommand,
    eventRouter,
    schedulerRouter,
  };
}

// ============================================================
// ポリシー登録
// ============================================================

function registerPolicies(
  prisma: PrismaClient,
  notificationRepository: NotificationRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): void {
  // SendSurveyOnClose: EventClosed → APPROVED 参加者に SURVEY 通知
  eventBus.subscribe('EventClosed', async ({ eventId }) => {
    const participations = await prisma.participation.findMany({
      where: { eventId, status: 'APPROVED' },
      select: { accountId: true },
    });
    const records: NotificationRecord[] = participations.map((p) => ({
      type: 'SURVEY',
      recipientId: p.accountId,
      payload: JSON.stringify({ eventId }),
    }));
    await notificationRepository.saveMany(records);
  });

  // NotifyEventCancelled: EventCancelled → APPROVED + WAITLISTED 参加者に EVENT_CANCELLED 通知
  eventBus.subscribe('EventCancelled', async ({ eventId }) => {
    const participations = await prisma.participation.findMany({
      where: { eventId, status: { in: ['APPROVED', 'WAITLISTED'] } },
      select: { accountId: true },
    });
    const records: NotificationRecord[] = participations.map((p) => ({
      type: 'EVENT_CANCELLED',
      recipientId: p.accountId,
      payload: JSON.stringify({ eventId }),
    }));
    await notificationRepository.saveMany(records);
  });

  // SendReminder: EventDateApproached → APPROVED 参加者に REMINDER 通知
  eventBus.subscribe('EventDateApproached', async ({ eventId }) => {
    const participations = await prisma.participation.findMany({
      where: { eventId, status: 'APPROVED' },
      select: { accountId: true },
    });
    const records: NotificationRecord[] = participations.map((p) => ({
      type: 'REMINDER',
      recipientId: p.accountId,
      payload: JSON.stringify({ eventId }),
    }));
    await notificationRepository.saveMany(records);
  });
}
