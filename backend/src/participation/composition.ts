import type { PrismaClient } from '@prisma/client';
import { NotificationType } from '@prisma/client';
import type { Router } from 'express';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import { PrismaEventRepository } from '@event/repositories/prisma-event.repository';
import { PrismaParticipationRepository } from './repositories/prisma-participation.repository';
import {
  PrismaNotificationRepository,
  type NotificationRepository,
} from './repositories/prisma-notification.repository';
import {
  createApplyForEventCommand,
  type ApplyForEventCommand,
} from './usecases/commands/apply-for-event.command';
import {
  createApproveParticipationsCommand,
  type ApproveParticipationsCommand,
} from './usecases/commands/approve-participations.command';
import {
  createCancelParticipationCommand,
  type CancelParticipationCommand,
} from './usecases/commands/cancel-participation.command';
import {
  createGetApplicationListQuery,
  type GetApplicationListQuery,
} from './usecases/queries/get-application-list.query';
import {
  createGetRemainingCapacityQuery,
  type GetRemainingCapacityQuery,
} from './usecases/queries/get-remaining-capacity.query';
import {
  createGetMyParticipationsQuery,
  type GetMyParticipationsQuery,
} from './usecases/queries/get-my-participations.query';
import { promoteFromWaitlist } from './models/participation';
import {
  createParticipationRouter,
  createParticipationSelfRouter,
} from './controllers/participation.controller';

// ============================================================
// Participation コンテキスト 依存性構成
// ============================================================

export interface ParticipationDependencies {
  readonly applyForEventCommand: ApplyForEventCommand;
  readonly approveParticipationsCommand: ApproveParticipationsCommand;
  readonly cancelParticipationCommand: CancelParticipationCommand;
  readonly getApplicationListQuery: GetApplicationListQuery;
  readonly getRemainingCapacityQuery: GetRemainingCapacityQuery;
  readonly getMyParticipationsQuery: GetMyParticipationsQuery;
  readonly participationRouter: Router;
  readonly participationSelfRouter: Router;
}

/**
 * Participation コンテキストの依存性を構成する（Composition Root）。
 *
 * ポリシー（subscribe）:
 *  - SendApprovalNotification: ParticipationApproved → APPROVAL 通知
 *  - PromoteFromWaitlist:      ParticipationCancelled → 先頭の WAITLISTED を APPROVED に昇格 + WAITLIST_PROMOTED 通知
 *  - NotifyOrganizerOnCancel:  ParticipationCancelled → 主催者に PARTICIPANT_CANCELLED 通知
 */
export function createParticipationDependencies(
  prisma: PrismaClient,
  eventBus: InMemoryEventBus<MeetupDomainEvent>
): ParticipationDependencies {
  const participationRepository = new PrismaParticipationRepository(prisma);
  const notificationRepository: NotificationRepository = new PrismaNotificationRepository(prisma);
  const eventRepository = new PrismaEventRepository(prisma);

  // --- Usecases ---
  const applyForEventCommand = createApplyForEventCommand(
    eventRepository,
    participationRepository,
    eventBus
  );
  const approveParticipationsCommand = createApproveParticipationsCommand(
    eventRepository,
    participationRepository,
    eventBus
  );
  const cancelParticipationCommand = createCancelParticipationCommand(
    participationRepository,
    eventBus
  );
  const getApplicationListQuery = createGetApplicationListQuery(prisma);
  const getRemainingCapacityQuery = createGetRemainingCapacityQuery(
    prisma,
    participationRepository
  );
  const getMyParticipationsQuery = createGetMyParticipationsQuery(prisma);

  // --- Policies ---

  // SendApprovalNotification: 承認されたら APPROVAL 通知
  eventBus.subscribe('ParticipationApproved', async (event) => {
    await notificationRepository.create(
      NotificationType.APPROVAL,
      event.accountId,
      JSON.stringify({ participationId: event.participationId, eventId: event.eventId })
    );
  });

  // PromoteFromWaitlist & NotifyOrganizerOnCancel
  eventBus.subscribe('ParticipationCancelled', async (event) => {
    // 主催者に PARTICIPANT_CANCELLED 通知
    const eventRecord = await prisma.event.findUnique({
      where: { id: event.eventId },
      select: { createdBy: true },
    });
    if (eventRecord) {
      await notificationRepository.create(
        NotificationType.PARTICIPANT_CANCELLED,
        eventRecord.createdBy,
        JSON.stringify({ participationId: event.participationId, eventId: event.eventId })
      );
    }

    // キャンセル待ち先頭を昇格
    const first = await participationRepository.findFirstWaitlisted(event.eventId);
    if (!first) return;
    const promoted = promoteFromWaitlist(first);
    if (!promoted.ok) return;
    await participationRepository.save(promoted.value);
    await notificationRepository.create(
      NotificationType.WAITLIST_PROMOTED,
      promoted.value.accountId,
      JSON.stringify({
        participationId: promoted.value.id,
        eventId: promoted.value.eventId,
      })
    );
  });

  // --- Routers ---
  const participationRouter = createParticipationRouter({
    applyForEventCommand,
    approveParticipationsCommand,
    getApplicationListQuery,
    getRemainingCapacityQuery,
  });
  const participationSelfRouter = createParticipationSelfRouter({
    cancelParticipationCommand,
    getMyParticipationsQuery,
  });

  return {
    applyForEventCommand,
    approveParticipationsCommand,
    cancelParticipationCommand,
    getApplicationListQuery,
    getRemainingCapacityQuery,
    getMyParticipationsQuery,
    participationRouter,
    participationSelfRouter,
  };
}
