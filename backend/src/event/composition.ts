import type { PrismaClient } from '@prisma/client';
import type { Router } from 'express';
import { InMemoryEventBus } from '@shared/event-bus';
import { createRequireCommunityRole } from '@shared/middleware/community-role.middleware';
import { PrismaCommunityRepository } from '@community/repositories/prisma-community.repository';
import { PrismaCommunityMemberRepository } from '@community/repositories/prisma-community-member.repository';
import { CommunityMemberRole } from '@community/models/schemas/member.schema';
import { PrismaEventRepository } from './repositories/prisma-event.repository';
import {
  createCreateEventCommand,
  type CreateEventCommand,
} from './usecases/commands/create-event.command';
import {
  createPublishEventCommand,
  type PublishEventCommand,
} from './usecases/commands/publish-event.command';
import { createCommunityEventRouter } from './controllers/community-event.controller';
import type { EventDomainEvent } from './errors/event-errors';

// ============================================================
// Event コンテキスト 依存性構成
// ============================================================

export interface EventContextDependencies {
  readonly createEventCommand: CreateEventCommand;
  readonly publishEventCommand: PublishEventCommand;
  readonly communityEventRouter: Router;
}

export function createEventDependencies(prisma: PrismaClient): EventContextDependencies {
  const eventRepository = new PrismaEventRepository(prisma);
  const communityRepository = new PrismaCommunityRepository(prisma);
  const communityMemberRepository = new PrismaCommunityMemberRepository(prisma);
  const eventBus = new InMemoryEventBus<EventDomainEvent>();

  const createEventCommand = createCreateEventCommand(
    communityRepository,
    eventRepository,
    eventBus
  );

  const publishEventCommand = createPublishEventCommand(eventRepository, eventBus);

  const communityEventRouter = createCommunityEventRouter({
    createEventCommand,
    publishEventCommand,
    requireCommunityRole: createRequireCommunityRole(
      communityMemberRepository,
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN
    ),
    prisma,
  });

  return {
    createEventCommand,
    publishEventCommand,
    communityEventRouter,
  };
}
