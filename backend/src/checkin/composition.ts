import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import { PrismaParticipationRepository } from '@participation/repositories/prisma-participation.repository';
import { PrismaCheckInRepository } from './repositories/prisma-checkin.repository';
import { createCheckInCommand, type CheckInCommand } from './usecases/commands/check-in.command';
import {
  createListCheckInsQuery,
  type ListCheckInsQuery,
} from './usecases/queries/list-checkins.query';
import { createCheckInRouter } from './controllers/checkin.controller';

// ============================================================
// CheckIn コンテキスト 依存性構成
// ============================================================

export interface CheckInDependencies {
  readonly checkInCommand: CheckInCommand;
  readonly listCheckInsQuery: ListCheckInsQuery;
  readonly checkinRouter: Router;
}

/**
 * CheckIn コンテキストの依存性を構成する（Composition Root）
 *
 * eventBus は現在未使用だが、将来的な CheckedIn 等のドメインイベント発行を
 * 想定して署名に含めている。
 */
export function createCheckinDependencies(
  prisma: PrismaClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _eventBus: InMemoryEventBus<MeetupDomainEvent>
): CheckInDependencies {
  const checkInRepository = new PrismaCheckInRepository(prisma);
  const participationRepository = new PrismaParticipationRepository(prisma);

  const checkInCommand = createCheckInCommand(participationRepository, checkInRepository);
  const listCheckInsQuery = createListCheckInsQuery(prisma, checkInRepository);

  const checkinRouter = createCheckInRouter({ checkInCommand, listCheckInsQuery });

  return {
    checkInCommand,
    listCheckInsQuery,
    checkinRouter,
  };
}
