import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { InMemoryEventBus } from '@shared/event-bus';
import { createCommunity } from '../../models/community';
import type { CommunityCategory, CommunityVisibility } from '../../models/schemas/community.schema';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../repositories/community-member.repository';
import type {
  CreateCommunityError,
  CommunityCreatedEvent,
  CommunityDomainEvent,
} from '../../errors/community-errors';

/** 1ユーザーあたりの最大コミュニティ作成数 */
const MAX_COMMUNITIES_PER_USER = 10;

// ============================================================
// コミュニティ作成コマンド
// ============================================================

export interface CreateCommunityInput {
  readonly id: CommunityId;
  readonly ownerMemberId: CommunityMemberId;
  readonly accountId: AccountId;
  readonly name: string;
  readonly description: string | null;
  readonly category: CommunityCategory;
  readonly visibility: CommunityVisibility;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreateCommunityResult = {
  readonly community: import('../../models/community').Community;
  readonly ownerMember: import('../../models/community-member').CommunityMember;
};

// ============================================================
// コミュニティ作成ユースケース
// ============================================================

/**
 * コミュニティ作成ユースケース
 *
 * 名前重複チェック・上限チェック後、コミュニティを作成しイベントを発行する。
 */
export type CreateCommunityCommand = (
  command: CreateCommunityInput
) => Promise<Result<CreateCommunityResult, CreateCommunityError>>;

export function createCreateCommunityCommand(
  communityRepository: CommunityRepository,
  communityMemberRepository: CommunityMemberRepository,
  eventBus: InMemoryEventBus<CommunityDomainEvent>
): CreateCommunityCommand {
  return async (command) => {
    // 名前重複チェック
    const existing = await communityRepository.findByName(command.name);
    if (existing) {
      return err({ type: 'DuplicateCommunityName', name: command.name });
    }

    // オーナーのコミュニティ数チェック
    const count = await communityRepository.countByOwnerAccountId(command.accountId);
    if (count >= MAX_COMMUNITIES_PER_USER) {
      return err({ type: 'TooManyCommunities' });
    }

    // ファクトリでコミュニティ+オーナーメンバー生成
    const createResult = createCommunity({
      id: command.id,
      ownerMemberId: command.ownerMemberId,
      ownerAccountId: command.accountId,
      name: command.name,
      description: command.description,
      category: command.category,
      visibility: command.visibility,
      createdAt: command.createdAt,
      updatedAt: command.updatedAt,
    });

    if (!createResult.ok) return createResult;
    const { community, ownerMember } = createResult.value;

    // リポジトリに保存
    await communityRepository.save(community);
    await communityMemberRepository.save(ownerMember);

    // イベント発行
    const event: CommunityCreatedEvent = {
      type: 'CommunityCreated',
      communityId: community.id,
      accountId: command.accountId,
      name: community.name,
      occurredAt: command.createdAt,
    };
    await eventBus.publish(event);

    return ok({ community, ownerMember });
  };
}
