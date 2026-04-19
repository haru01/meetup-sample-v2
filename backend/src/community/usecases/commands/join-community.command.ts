import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { CommunityMember } from '../../models/community-member';
import { joinCommunity } from '../../models/community-member';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../repositories/community-member.repository';
import type {
  CommunityDomainEvent,
  JoinCommunityError,
  MemberApplicationSubmittedEvent,
  MemberJoinedEvent,
} from '../../errors/community-errors';

// ============================================================
// コミュニティ参加コマンド
// ============================================================

export interface JoinCommunityInput {
  readonly communityId: CommunityId;
  readonly accountId: AccountId;
  readonly memberId: CommunityMemberId;
  readonly occurredAt: Date;
}

// ============================================================
// コミュニティ参加ユースケース
// ============================================================

/**
 * コミュニティ参加ユースケース
 *
 * PUBLIC → ACTIVE、PRIVATE → PENDING でメンバーを追加する。
 * PUBLIC → MemberJoined、PRIVATE → MemberApplicationSubmitted を発火する。
 */
export type JoinCommunityCommand = (
  command: JoinCommunityInput
) => Promise<Result<CommunityMember, JoinCommunityError>>;

export function createJoinCommunityCommand(
  communityRepository: CommunityRepository,
  communityMemberRepository: CommunityMemberRepository,
  eventBus: InMemoryEventBus<CommunityDomainEvent>
): JoinCommunityCommand {
  return async (command) => {
    // コミュニティ存在チェック
    const community = await communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    // 既存メンバーチェック
    const existingMember = await communityMemberRepository.findByIds(
      command.communityId,
      command.accountId
    );
    if (existingMember) {
      return err({ type: 'AlreadyMember' });
    }

    // ドメインモデルでメンバー生成
    const memberResult = joinCommunity({
      community,
      accountId: command.accountId,
      memberId: command.memberId,
    });

    if (!memberResult.ok) return memberResult;
    const member = memberResult.value;

    // リポジトリに保存
    await communityMemberRepository.save(member);

    // visibility に応じたイベント発火
    const event: MemberJoinedEvent | MemberApplicationSubmittedEvent =
      community.visibility === 'PUBLIC'
        ? {
            type: 'MemberJoined',
            communityId: member.communityId,
            accountId: member.accountId,
            memberId: member.id,
            occurredAt: command.occurredAt,
          }
        : {
            type: 'MemberApplicationSubmitted',
            communityId: member.communityId,
            accountId: member.accountId,
            memberId: member.id,
            occurredAt: command.occurredAt,
          };
    await eventBus.publish(event);

    return ok(member);
  };
}
