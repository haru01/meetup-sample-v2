import type { PrismaClient } from '@prisma/client';
import type { RequestHandler } from 'express';
import { PrismaCommunityRepository } from './repositories/prisma-community.repository';
import { PrismaCommunityMemberRepository } from './repositories/prisma-community-member.repository';
import { InMemoryEventBus } from '@shared/event-bus';
import {
  createCreateCommunityCommand,
  type CreateCommunityCommand,
} from './usecases/commands/create-community.command';
import {
  createJoinCommunityCommand,
  type JoinCommunityCommand,
} from './usecases/commands/join-community.command';
import {
  createLeaveCommunityCommand,
  type LeaveCommunityCommand,
} from './usecases/commands/leave-community.command';
import {
  createApproveMemberCommand,
  type ApproveMemberCommand,
} from './usecases/commands/approve-member.command';
import {
  createRejectMemberCommand,
  type RejectMemberCommand,
} from './usecases/commands/reject-member.command';
import {
  createGetCommunityQuery,
  type GetCommunityQuery,
} from './usecases/queries/get-community.query';
import {
  createListCommunitiesQuery,
  type ListCommunitiesQuery,
} from './usecases/queries/list-communities.query';
import {
  createListMembersQuery,
  type ListMembersQuery,
} from './usecases/queries/list-members.query';
import {
  createListMembersReadQuery,
  type ListMembersReadQuery,
} from './usecases/queries/list-members-read.query';
import { CommunityMemberRole } from './models/schemas/member.schema';
import { createRequireCommunityRole } from '@shared/middleware/community-role.middleware';
import type { CommunityCreatedEvent } from './errors/community-errors';

// ============================================================
// Community コンテキスト 依存性構成
// ============================================================

export interface CommunityDependencies {
  readonly createCommunityCommand: CreateCommunityCommand;
  readonly getCommunityQuery: GetCommunityQuery;
  readonly listCommunitiesQuery: ListCommunitiesQuery;
}

export interface MemberDependencies {
  readonly joinCommunityCommand: JoinCommunityCommand;
  readonly leaveCommunityCommand: LeaveCommunityCommand;
  readonly listMembersQuery: ListMembersQuery;
  readonly approveMemberCommand: ApproveMemberCommand;
  readonly rejectMemberCommand: RejectMemberCommand;
  readonly listMembersReadQuery: ListMembersReadQuery;
  readonly requireCommunityRole: RequestHandler;
}

/**
 * Community コンテキストの依存性を構成する（Composition Root）
 */
export function createCommunityDependencies(prisma: PrismaClient): {
  community: CommunityDependencies;
  member: MemberDependencies;
} {
  const communityRepository = new PrismaCommunityRepository(prisma);
  const communityMemberRepository = new PrismaCommunityMemberRepository(prisma);
  const eventBus = new InMemoryEventBus<CommunityCreatedEvent>();

  return {
    community: {
      createCommunityCommand: createCreateCommunityCommand(
        communityRepository,
        communityMemberRepository,
        eventBus
      ),
      getCommunityQuery: createGetCommunityQuery(communityRepository, communityMemberRepository),
      listCommunitiesQuery: createListCommunitiesQuery(communityRepository),
    },
    member: {
      joinCommunityCommand: createJoinCommunityCommand(
        communityRepository,
        communityMemberRepository
      ),
      leaveCommunityCommand: createLeaveCommunityCommand(
        communityRepository,
        communityMemberRepository
      ),
      listMembersQuery: createListMembersQuery(communityRepository, communityMemberRepository),
      approveMemberCommand: createApproveMemberCommand(
        communityRepository,
        communityMemberRepository
      ),
      rejectMemberCommand: createRejectMemberCommand(
        communityRepository,
        communityMemberRepository
      ),
      listMembersReadQuery: createListMembersReadQuery(prisma),
      requireCommunityRole: createRequireCommunityRole(
        communityMemberRepository,
        CommunityMemberRole.OWNER,
        CommunityMemberRole.ADMIN
      ),
    },
  };
}
