import type { PrismaClient } from '@prisma/client';
import type { CommunityId, CommunityMemberId, AccountId } from '@shared/schemas/common';
import type {
  CommunityMemberRole,
  CommunityMemberStatus,
} from '../../models/schemas/member.schema';
import { ok, err, type Result } from '@shared/result';
import type { ListMembersError } from '../../errors/community-errors';

// ============================================================
// メンバー Read モデル
// ============================================================

export interface MemberReadModel {
  readonly id: CommunityMemberId;
  readonly communityId: CommunityId;
  readonly accountId: AccountId;
  readonly accountName: string;
  readonly role: CommunityMemberRole;
  readonly status: CommunityMemberStatus;
  readonly createdAt: Date;
}

// ============================================================
// メンバー一覧取得（Read モデル）ユースケース
// ============================================================

export interface ListMembersReadInput {
  readonly communityId: CommunityId;
  readonly limit: number;
  readonly offset: number;
}

export type ListMembersReadResult = {
  readonly members: MemberReadModel[];
  readonly total: number;
};

export type ListMembersReadQuery = (
  command: ListMembersReadInput
) => Promise<Result<ListMembersReadResult, ListMembersError>>;

export function createListMembersReadQuery(prisma: PrismaClient): ListMembersReadQuery {
  return async (command) => {
    const memberWhere = { communityId: command.communityId, status: 'ACTIVE' as const };

    const [community, total] = await prisma.$transaction([
      prisma.community.findUnique({
        where: { id: command.communityId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            include: { account: { select: { name: true } } },
            orderBy: { createdAt: 'asc' },
            take: command.limit,
            skip: command.offset,
          },
        },
      }),
      prisma.communityMember.count({ where: memberWhere }),
    ]);

    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    return ok({
      members: community.members.map((r) => ({
        id: r.id as CommunityMemberId,
        communityId: r.communityId as CommunityId,
        accountId: r.accountId as AccountId,
        accountName: r.account.name,
        role: r.role as CommunityMemberRole,
        status: r.status as CommunityMemberStatus,
        createdAt: r.createdAt,
      })),
      total,
    });
  };
}
