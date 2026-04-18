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
import type { NotificationType } from '@notification/models/schemas/notification.schema';
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

/**
 * 通知ポリシーで参照する参加ステータス（event は participation に依存できないためローカル定義）。
 * 値は `prisma/schema/participation/participation.prisma` の ParticipationStatus enum と同期させる。
 */
type ParticipationStatusRef = 'APPLIED' | 'APPROVED' | 'WAITLISTED' | 'CANCELLED';

/** 通知ポリシーのチャンクサイズ（findMany + createMany 一括単位） */
const NOTIFICATION_BATCH_SIZE = 200;

/**
 * 指定ステータスに該当する参加者 accountId を cursor pagination で
 * チャンク単位にストリームする非同期ジェネレータ。
 *
 * 参加者が数百〜数千人規模のイベントでも、findMany で全件メモリに
 * 載せることなく固定サイズのバッチを順次流すことを目的とする。
 */
async function* streamParticipantsByStatus(
  prisma: PrismaClient,
  eventId: string,
  statuses: readonly ParticipationStatusRef[],
  batchSize: number
): AsyncGenerator<string[]> {
  let cursor: string | undefined;
  for (;;) {
    const batch = await prisma.participation.findMany({
      where: { eventId, status: { in: [...statuses] } },
      select: { id: true, accountId: true },
      orderBy: { id: 'asc' },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (batch.length === 0) return;
    yield batch.map((p) => p.accountId);
    if (batch.length < batchSize) return;
    cursor = batch[batch.length - 1]?.id;
    if (!cursor) return;
  }
}

/**
 * 指定ステータスに該当する参加者へ通知をバッチ保存する。
 * cursor pagination でチャンク取得し、チャンク毎に createMany で一括 insert する。
 */
async function notifyParticipants(
  prisma: PrismaClient,
  notificationRepository: NotificationRepository,
  eventId: string,
  statuses: readonly ParticipationStatusRef[],
  type: NotificationType
): Promise<void> {
  const payload = JSON.stringify({ eventId });
  for await (const accountIds of streamParticipantsByStatus(
    prisma,
    eventId,
    statuses,
    NOTIFICATION_BATCH_SIZE
  )) {
    const records: NotificationRecord[] = accountIds.map((accountId) => ({
      type,
      recipientId: accountId,
      payload,
    }));
    await notificationRepository.saveMany(records);
  }
}

function registerPolicies(
  prisma: PrismaClient,
  notificationRepository: NotificationRepository,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): void {
  // SendSurveyOnClose: EventClosed → APPROVED 参加者に SURVEY 通知
  eventBus.subscribe('EventClosed', async ({ eventId }) => {
    await notifyParticipants(prisma, notificationRepository, eventId, ['APPROVED'], 'SURVEY');
  });

  // NotifyEventCancelled: EventCancelled → APPROVED + WAITLISTED 参加者に EVENT_CANCELLED 通知
  eventBus.subscribe('EventCancelled', async ({ eventId }) => {
    await notifyParticipants(
      prisma,
      notificationRepository,
      eventId,
      ['APPROVED', 'WAITLISTED'],
      'EVENT_CANCELLED'
    );
  });

  // SendReminder: EventDateApproached → APPROVED 参加者に REMINDER 通知
  eventBus.subscribe('EventDateApproached', async ({ eventId }) => {
    await notifyParticipants(prisma, notificationRepository, eventId, ['APPROVED'], 'REMINDER');
  });
}
