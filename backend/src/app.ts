import express from 'express';
import type { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { PrismaClient } from '@prisma/client';
import { generateOpenAPIDocument } from '@shared/openapi/registry';
import { createOpenApiValidatorMiddleware } from '@shared/middleware/openapi-validator.middleware';
import { errorHandlerMiddleware } from '@shared/middleware/error-handler.middleware';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import { prisma as defaultPrisma } from './infrastructure/prisma';
import { createAuthRouter } from './auth/controllers/auth.controller';
import { createCommunityRouter } from './community/controllers/community.controller';
import { createMemberRouter } from './community/controllers/member.controller';
import { createAuthDependencies } from './auth/composition';
import { createCommunityDependencies } from './community/composition';
import { createEventDependencies } from './event/composition';
import { createParticipationDependencies } from './participation/composition';
import { createCheckinDependencies } from './checkin/composition';
// OpenAPI定義を登録（side-effect import）
import './auth/controllers/auth-openapi';
import './community/controllers/community-openapi';
import './community/controllers/member-openapi';
import './event/controllers/event-openapi';
import './participation/controllers/participation-openapi';
import './checkin/controllers/checkin-openapi';

// ============================================================
// Express Application Factory
// ============================================================

/**
 * Expressアプリケーションを作成する
 *
 * @param prismaClient Prisma クライアント（テスト時はテスト用インスタンスを渡す）
 */
export function createApp(prismaClient: PrismaClient = defaultPrisma): Application {
  const application = express();

  // JSON body parser
  application.use(express.json());

  // OpenAPI document
  const openApiDocument = generateOpenAPIDocument();

  // Swagger UI
  application.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  // Expose raw OpenAPI spec
  application.get('/openapi.json', (_req, res) => res.json(openApiDocument));

  // OpenAPI request validation
  application.use(createOpenApiValidatorMiddleware(openApiDocument));

  // Health check
  application.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Composition Root: 依存性の構成
  const meetupEventBus = new InMemoryEventBus<MeetupDomainEvent>();

  const authDeps = createAuthDependencies(prismaClient);
  const communityDeps = createCommunityDependencies(prismaClient);
  const eventDeps = createEventDependencies(prismaClient, meetupEventBus);
  const participationDeps = createParticipationDependencies(prismaClient, meetupEventBus);
  const checkinDeps = createCheckinDependencies(prismaClient, meetupEventBus);

  // Auth routes
  application.use('/auth', createAuthRouter(authDeps));

  // Community routes
  application.use('/communities', createCommunityRouter(communityDeps.community));

  // Member routes (nested under communities)
  application.use('/communities/:id/members', createMemberRouter(communityDeps.member));

  // Community event routes (CreateEvent: DRAFT 作成) — event BC が担う
  application.use('/communities/:id/events', eventDeps.communityEventRouter);

  // Event context routes (Publish / Update / Close / Cancel / List)
  application.use('/events', eventDeps.eventRouter);

  // Scheduler route (POST /scheduler/send-reminders)
  application.use('/scheduler', eventDeps.schedulerRouter);

  // Participation routes (/events/:id/participations, /events/:id/capacity)
  application.use('/events', participationDeps.participationRouter);

  // Participation self routes (/participations/:id, /participations/my)
  application.use('/participations', participationDeps.participationSelfRouter);

  // CheckIn routes (/events/:id/checkins)
  application.use('/events/:id/checkins', checkinDeps.checkinRouter);

  // Error handler (MUST be last)
  application.use(errorHandlerMiddleware);

  return application;
}

// ============================================================
// Default application instance (production)
// ============================================================
export const app = createApp();
