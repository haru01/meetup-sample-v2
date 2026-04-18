import { ok, type Result } from '@shared/result';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type {
  CommunityCategory,
  CommunityVisibility,
  CommunityName,
  CommunityDescription,
  Community,
} from './schemas/community.schema';
import type { CommunityMember } from './community-member';
import { CommunityMemberRole, CommunityMemberStatus } from './schemas/member.schema';

export type { Community } from './schemas/community.schema';
export { CommunitySchema } from './schemas/community.schema';

// ============================================================
// コミュニティ作成
// ============================================================

export interface CreateCommunityInput {
  readonly id: CommunityId;
  readonly name: CommunityName;
  readonly description: CommunityDescription;
  readonly category: CommunityCategory;
  readonly visibility: CommunityVisibility;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly ownerAccountId: AccountId;
  readonly ownerMemberId: CommunityMemberId;
}

export interface CreateCommunityResult {
  readonly community: Community;
  readonly ownerMember: CommunityMember;
}

/**
 * コミュニティを作成する（ファクトリ関数）
 *
 * コミュニティとオーナーメンバーを同時に生成する。
 * ドメイン不変条件（名前重複・上限数）はUseCaseで事前チェック。
 *
 * @param input コミュニティ作成入力
 * @returns コミュニティとオーナーメンバー
 */
export function createCommunity(input: CreateCommunityInput): Result<CreateCommunityResult, never> {
  const community: Community = {
    id: input.id,
    name: input.name,
    description: input.description,
    category: input.category,
    visibility: input.visibility,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };

  const ownerMember: CommunityMember = {
    id: input.ownerMemberId,
    communityId: input.id,
    accountId: input.ownerAccountId,
    role: CommunityMemberRole.OWNER,
    status: CommunityMemberStatus.ACTIVE,
    createdAt: input.createdAt,
  };

  return ok({ community, ownerMember });
}
