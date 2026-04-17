import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { Community } from './community';
import { CommunityMemberRole, CommunityMemberStatus } from './schemas/member.schema';
import type { LeaveCommunityError, ApproveMemberError } from '../errors/community-errors';

// ============================================================
// コミュニティメンバーエンティティ
// ============================================================

export interface CommunityMember {
  readonly id: CommunityMemberId;
  readonly communityId: CommunityId;
  readonly accountId: AccountId;
  readonly role: CommunityMemberRole;
  readonly status: CommunityMemberStatus;
  readonly createdAt: Date;
}

// ============================================================
// コミュニティ参加
// ============================================================

export interface JoinCommunityInput {
  readonly community: Community;
  readonly accountId: AccountId;
  readonly memberId: CommunityMemberId;
}

/**
 * コミュニティに参加する（ファクトリ関数）
 *
 * PUBLIC → ACTIVE、PRIVATE → PENDING
 */
export function joinCommunity(input: JoinCommunityInput): Result<CommunityMember, never> {
  const status =
    input.community.visibility === 'PUBLIC'
      ? CommunityMemberStatus.ACTIVE
      : CommunityMemberStatus.PENDING;

  return ok({
    id: input.memberId,
    communityId: input.community.id,
    accountId: input.accountId,
    role: CommunityMemberRole.MEMBER,
    status,
    createdAt: new Date(),
  });
}

// ============================================================
// コミュニティ脱退
// ============================================================

/**
 * コミュニティから脱退する（遷移関数）
 *
 * オーナーは脱退不可
 */
export function leaveCommunity(member: CommunityMember): Result<void, LeaveCommunityError> {
  if (member.role === CommunityMemberRole.OWNER) {
    return err({ type: 'OwnerCannotLeave' });
  }
  return ok(undefined);
}

// ============================================================
// メンバー承認
// ============================================================

/**
 * メンバーを承認する（遷移関数）
 *
 * PENDING → ACTIVE、すでにACTIVEの場合はエラー
 */
export function approveMember(
  member: CommunityMember
): Result<CommunityMember, ApproveMemberError> {
  if (member.status === CommunityMemberStatus.ACTIVE) {
    return err({ type: 'MemberAlreadyActive' });
  }

  return ok({
    ...member,
    status: CommunityMemberStatus.ACTIVE,
  });
}
