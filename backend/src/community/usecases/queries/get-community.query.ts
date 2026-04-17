import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId } from '@shared/schemas/common';
import type { Community } from '../../models/community';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../repositories/community-member.repository';
import type { GetCommunityError } from '../../errors/community-errors';

// ============================================================
// コミュニティ取得コマンド
// ============================================================

export interface GetCommunityInput {
  readonly communityId: CommunityId;
  readonly requestingAccountId?: AccountId;
}

// ============================================================
// コミュニティ取得ユースケース
// ============================================================

/**
 * コミュニティ取得ユースケース
 *
 * PUBLIC は誰でも閲覧可能。PRIVATE はメンバーのみ閲覧可能。
 */
export type GetCommunityQuery = (
  command: GetCommunityInput
) => Promise<Result<Community, GetCommunityError>>;

export function createGetCommunityQuery(
  communityRepository: CommunityRepository,
  communityMemberRepository: CommunityMemberRepository
): GetCommunityQuery {
  return async (command) => {
    const community = await communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    // PUBLIC は誰でも閲覧可能
    if (community.visibility === 'PUBLIC') {
      return ok(community);
    }

    // PRIVATE はメンバーのみ閲覧可能
    if (!command.requestingAccountId) {
      return err({ type: 'CommunityNotFound' });
    }

    const member = await communityMemberRepository.findByIds(
      community.id,
      command.requestingAccountId
    );

    if (!member) {
      return err({ type: 'CommunityNotFound' });
    }

    return ok(community);
  };
}
