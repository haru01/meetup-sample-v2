import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { InMemoryEventBus } from '@shared/event-bus';
import { leaveCommunity } from '../../models/community-member';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../repositories/community-member.repository';
import type {
  CommunityDomainEvent,
  LeaveCommunityError,
  MemberLeftEvent,
} from '../../errors/community-errors';

// ============================================================
// コミュニティ脱退コマンド
// ============================================================

export interface LeaveCommunityInput {
  readonly communityId: CommunityId;
  readonly accountId: AccountId;
  /** メンバーID指定で脱退する場合（所有者確認を行う） */
  readonly memberId?: CommunityMemberId;
  readonly occurredAt: Date;
}

// ============================================================
// コミュニティ脱退ユースケース
// ============================================================

/**
 * コミュニティ脱退ユースケース
 *
 * メンバーをコミュニティから削除し、MemberLeft を発火する。オーナーは脱退不可。
 * memberId が指定された場合、そのメンバーが accountId の所有であることを確認する。
 */
export type LeaveCommunityCommand = (
  command: LeaveCommunityInput
) => Promise<Result<void, LeaveCommunityError>>;

export function createLeaveCommunityCommand(
  communityRepository: CommunityRepository,
  communityMemberRepository: CommunityMemberRepository,
  eventBus: InMemoryEventBus<CommunityDomainEvent>
): LeaveCommunityCommand {
  return async (command) => {
    // コミュニティ存在チェック
    const community = await communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    // memberId 指定時: メンバーIDで検索し、accountId の所有確認
    if (command.memberId) {
      const memberById = await communityMemberRepository.findById(command.memberId);
      if (!memberById || memberById.accountId !== command.accountId) {
        return err({ type: 'MemberNotFound' });
      }
    }

    // メンバー存在チェック（communityId + accountId）
    const member = await communityMemberRepository.findByIds(
      command.communityId,
      command.accountId
    );
    if (!member) {
      return err({ type: 'MemberNotFound' });
    }

    // ドメインモデルで脱退チェック（オーナー不可）
    const leaveResult = leaveCommunity(member);
    if (!leaveResult.ok) {
      return leaveResult;
    }

    // メンバーレコードを削除
    await communityMemberRepository.delete(member.id);

    // イベント発火
    const event: MemberLeftEvent = {
      type: 'MemberLeft',
      communityId: member.communityId,
      memberId: member.id,
      accountId: member.accountId,
      occurredAt: command.occurredAt,
    };
    await eventBus.publish(event);

    return ok(undefined);
  };
}
