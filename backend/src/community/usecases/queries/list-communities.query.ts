import { ok, type Result } from '@shared/result';
import type { AccountId } from '@shared/schemas/common';
import type { Community } from '../../models/community';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityVisibility } from '../../models/schemas/community.schema';
import type { ListCommunitiesError } from '../../errors/community-errors';

// ============================================================
// コミュニティ一覧取得コマンド
// ============================================================

export interface ListCommunitiesInput {
  readonly category?: string;
  readonly memberAccountId?: AccountId;
  readonly limit: number;
  readonly offset: number;
}

export type ListCommunitiesResult = {
  readonly communities: Community[];
  readonly total: number;
};

// ============================================================
// コミュニティ一覧取得ユースケース
// ============================================================

/**
 * コミュニティ一覧取得ユースケース
 *
 * memberAccountId 指定時はそのユーザーが所属するコミュニティ一覧を返す。
 * 未指定時は PUBLIC コミュニティのみを返す。
 */
export type ListCommunitiesQuery = (
  command: ListCommunitiesInput
) => Promise<Result<ListCommunitiesResult, ListCommunitiesError>>;

export function createListCommunitiesQuery(
  communityRepository: CommunityRepository
): ListCommunitiesQuery {
  return async (command) => {
    const visibility: CommunityVisibility | undefined = command.memberAccountId
      ? undefined
      : 'PUBLIC';

    const { communities, total } = await communityRepository.findAll({
      category: command.category,
      memberAccountId: command.memberAccountId,
      visibility,
      limit: command.limit,
      offset: command.offset,
    });

    return ok({ communities, total });
  };
}
