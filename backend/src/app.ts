import express from 'express';
import type { Application } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { PrismaClient } from '@prisma/client';
import { generateOpenAPIDocument } from '@shared/openapi/registry';
import { createOpenApiValidatorMiddleware } from '@shared/middleware/openapi-validator.middleware';
import { errorHandlerMiddleware } from '@shared/middleware/error-handler.middleware';
import {
  createGlobalRateLimiter,
  createPublicReadRateLimiter,
} from '@shared/middleware/rate-limit.middleware';
import {
  publicReadCacheControl,
  privateNoStoreCacheControl,
} from '@shared/middleware/cache-control.middleware';
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

  // IP を正しく把握するため、リバースプロキシ越しの X-Forwarded-For を信頼する。
  // rate-limit のキー算出と監査ログの精度を担保する目的。
  application.set('trust proxy', 1);

  // 認証系 / 機密系のデフォルトは no-store。公開 GET は個別に publicReadCacheControl で上書きする。
  application.use(privateNoStoreCacheControl());

  // IP ベースのグローバルレート制限（DoS 耐性の下支え）
  application.use(createGlobalRateLimiter());

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

  // 未ログイン到達可能な公開 GET 向けの追加レート制限 + 短期キャッシュヘッダ。
  // Authorization ヘッダが付いている（＝ログイン済み）ケースでは、ユーザー固有の可視性
  // （例: accountId の有無、PRIVATE メンバー可視性）が変わり得るため public cache を付けず、
  // 上位で設定された privateNoStoreCacheControl をそのまま尊重する。
  const publicReadRateLimiter = createPublicReadRateLimiter();
  const publicReadCache = publicReadCacheControl();
  application.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (!isPublicReadPath(req.path)) return next();
    return publicReadRateLimiter(req, res, (limitErr) => {
      if (limitErr) return next(limitErr);
      if (req.headers['authorization']) return next();
      publicReadCache(req, res, next);
    });
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
// 公開 GET パス判定
// ============================================================
// `optionalAuth` が付与される read-only endpoint を対象に、short-TTL キャッシュと
// 厳しめのレート制限を掛ける。path prefix ベースで単純に判定する。
function isPublicReadPath(path: string): boolean {
  if (path === '/communities') return true;
  if (/^\/communities\/[^/]+$/.test(path)) return true;
  if (/^\/communities\/[^/]+\/members$/.test(path)) return true;
  if (/^\/communities\/[^/]+\/events$/.test(path)) return true;
  if (/^\/events\/[^/]+\/capacity$/.test(path)) return true;
  return false;
}

// ============================================================
// Default application instance (production)
// ============================================================
export const app = createApp();
