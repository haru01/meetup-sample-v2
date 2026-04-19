import { ok, err, type Result } from '@shared/result';
import type { CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../repositories/community-member.repository';
import type {
  CommunityDomainEvent,
  MemberRejectedEvent,
  RejectMemberError,
} from '../../errors/community-errors';

// ============================================================
// メンバー拒否コマンド
// ============================================================

export interface RejectMemberInput {
  readonly communityId: CommunityId;
  readonly targetMemberId: CommunityMemberId;
  readonly occurredAt: Date;
}

// ============================================================
// メンバー拒否ユースケース
// ============================================================

/**
 * メンバー拒否ユースケース
 *
 * メンバーレコードを削除し、MemberRejected を発火する。
 * 権限チェックはミドルウェアで実施済みのため、ここでは行わない。
 */
export type RejectMemberCommand = (
  command: RejectMemberInput
) => Promise<Result<void, RejectMemberError>>;

export function createRejectMemberCommand(
  communityRepository: CommunityRepository,
  communityMemberRepository: CommunityMemberRepository,
  eventBus: InMemoryEventBus<CommunityDomainEvent>
): RejectMemberCommand {
  return async (command) => {
    // コミュニティ存在チェック
    const community = await communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    // 対象メンバー取得
    const targetMember = await communityMemberRepository.findById(command.targetMemberId);
    if (!targetMember) {
      return err({ type: 'MemberNotFound' });
    }

    // メンバーレコードを削除
    await communityMemberRepository.delete(targetMember.id);

    // イベント発火
    const event: MemberRejectedEvent = {
      type: 'MemberRejected',
      communityId: targetMember.communityId,
      memberId: targetMember.id,
      accountId: targetMember.accountId,
      occurredAt: command.occurredAt,
    };
    await eventBus.publish(event);

    return ok(undefined);
  };
}
