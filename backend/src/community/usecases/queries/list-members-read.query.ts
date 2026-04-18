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
  /**
   * accountId は requester が当該コミュニティの ACTIVE メンバーである場合のみ含める。
   * 未ログイン・非メンバーには返さず、アカウント列挙による相関分析を防ぐ。
   */
  readonly accountId?: AccountId;
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
  readonly requestingAccountId?: AccountId;
}

export type ListMembersReadResult = {
  readonly members: MemberReadModel[];
  readonly total: number;
};

export type ListMembersReadQuery = (
  command: ListMembersReadInput
) => Promise<Result<ListMembersReadResult, ListMembersError>>;

/**
 * 閲覧可能性チェック: PUBLIC は誰でも、PRIVATE は ACTIVE メンバーのみ。
 * 非公開条件を満たさない場合は CommunityNotFound を返す（存在の有無を漏らさない）。
 * isActiveMember は requester が当該コミュニティの ACTIVE メンバーであるかを示し、
 * accountId 可視性制御に利用する。
 */
async function checkVisibility(
  prisma: PrismaClient,
  communityId: CommunityId,
  requestingAccountId: AccountId | undefined
): Promise<Result<{ isActiveMember: boolean }, ListMembersError>> {
  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: { visibility: true },
  });
  if (!community) {
    return err({ type: 'CommunityNotFound' });
  }
  const requestingMember = requestingAccountId
    ? await prisma.communityMember.findUnique({
        where: { communityId_accountId: { communityId, accountId: requestingAccountId } },
        select: { status: true },
      })
    : null;
  const isActiveMember = requestingMember?.status === 'ACTIVE';
  if (community.visibility === 'PRIVATE' && !isActiveMember) {
    return err({ type: 'CommunityNotFound' });
  }
  return ok({ isActiveMember });
}

/**
 * メンバー一覧取得ユースケース（Read モデル）
 *
 * PUBLIC は誰でも閲覧可能。PRIVATE は ACTIVE メンバーのみ閲覧可能。
 */
export function createListMembersReadQuery(prisma: PrismaClient): ListMembersReadQuery {
  return async (command) => {
    const visibilityResult = await checkVisibility(
      prisma,
      command.communityId,
      command.requestingAccountId
    );
    if (!visibilityResult.ok) {
      return visibilityResult;
    }
    const { isActiveMember } = visibilityResult.value;

    const memberWhere = { communityId: command.communityId, status: 'ACTIVE' as const };
    const [members, total] = await prisma.$transaction([
      prisma.communityMember.findMany({
        where: memberWhere,
        include: { account: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
        take: command.limit,
        skip: command.offset,
      }),
      prisma.communityMember.count({ where: memberWhere }),
    ]);

    return ok({
      members: members.map((r) => ({
        id: r.id as CommunityMemberId,
        communityId: r.communityId as CommunityId,
        ...(isActiveMember ? { accountId: r.accountId as AccountId } : {}),
        accountName: r.account.name,
        role: r.role as CommunityMemberRole,
        status: r.status as CommunityMemberStatus,
        createdAt: r.createdAt,
      })),
      total,
    });
  };
}
