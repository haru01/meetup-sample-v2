import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import { createRequireCommunityRole } from '@shared/middleware/community-role.middleware';
import { PrismaCommunityRepository } from '@community/repositories/prisma-community.repository';
import { PrismaCommunityMemberRepository } from '@community/repositories/prisma-community-member.repository';
import { CommunityMemberRole } from '@community/models/schemas/member.schema';
import { PrismaEventRepository } from './repositories/prisma-event.repository';
import { PrismaNotificationRepository } from '@notification/repositories/prisma-notification.repository';
import type {
  NotificationRepository,
  NotificationRecord,
} from '@notification/repositories/notification.repository';
import {
  createCreateEventCommand,
  type CreateEventCommand,
} from './usecases/commands/create-event.command';
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
  createCheckUpcomingEventsCommand,
  type CheckUpcomingEventsCommand,
} from './usecases/commands/check-upcoming-events.command';
import {
  createListPublishedEventsQuery,
  type ListPublishedEventsQuery,
} from './usecases/queries/list-published-events.query';
import { createGetEventQuery, type GetEventQuery } from './usecases/queries/get-event.query';
import { createEventRouter } from './controllers/event.controller';
import { createCommunityEventRouter } from './controllers/community-event.controller';
import { createSchedulerRouter } from './controllers/scheduler.controller';

// ============================================================
// Event コンテキスト 依存性構成
// ============================================================

export interface EventContextDependencies {
  readonly listPublishedEventsQuery: ListPublishedEventsQuery;
  readonly getEventQuery: GetEventQuery;
  readonly createEventCommand: CreateEventCommand;
  readonly publishEventCommand: PublishEventCommand;
  readonly updateEventCommand: UpdateEventCommand;
  readonly closeEventCommand: CloseEventCommand;
  readonly checkUpcomingEventsCommand: CheckUpcomingEventsCommand;
  readonly cancelEventCommand: CancelEventCommand;
  readonly eventRouter: Router;
  readonly communityEventRouter: Router;
  readonly schedulerRouter: Router;
}

export function createEventDependencies(
  prisma: PrismaClient,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): EventContextDependencies {
  const eventRepository = new PrismaEventRepository(prisma);
  const notificationRepository = new PrismaNotificationRepository(prisma);
  const communityRepository = new PrismaCommunityRepository(prisma);
  const communityMemberRepository = new PrismaCommunityMemberRepository(prisma);

  const listPublishedEventsQuery = createListPublishedEventsQuery(eventRepository);
  const getEventQuery = createGetEventQuery(eventRepository);
  const createEventCommand = createCreateEventCommand(communityRepository, eventRepository);
  const publishEventCommand = createPublishEventCommand(eventRepository, eventBus);
  const updateEventCommand = createUpdateEventCommand(eventRepository);
  const closeEventCommand = createCloseEventCommand(eventRepository, eventBus);
  const cancelEventCommand = createCancelEventCommand(eventRepository, eventBus);
  const checkUpcomingEventsCommand = createCheckUpcomingEventsCommand(eventRepository, eventBus);

  registerPolicies(prisma, notificationRepository, eventBus);

  const eventRouter = createEventRouter({
    listPublishedEventsQuery,
    getEventQuery,
    publishEventCommand,
    updateEventCommand,
    closeEventCommand,
    cancelEventCommand,
  });
  const communityEventRouter = createCommunityEventRouter({
    createEventCommand,
    requireCommunityRole: createRequireCommunityRole(
      communityMemberRepository,
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN
    ),
    prisma,
  });
  const schedulerRouter = createSchedulerRouter({ checkUpcomingEventsCommand });

  return {
    listPublishedEventsQuery,
    getEventQuery,
    createEventCommand,
    publishEventCommand,
    updateEventCommand,
    closeEventCommand,
    cancelEventCommand,
    checkUpcomingEventsCommand,
    eventRouter,
    communityEventRouter,
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
