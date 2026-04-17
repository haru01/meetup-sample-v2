import { ok, err, type Result } from '@shared/result';
import type { CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../repositories/community-member.repository';
import type { RejectMemberError } from '../../errors/community-errors';

// ============================================================
// メンバー拒否コマンド
// ============================================================

export interface RejectMemberInput {
  readonly communityId: CommunityId;
  readonly targetMemberId: CommunityMemberId;
}

// ============================================================
// メンバー拒否ユースケース
// ============================================================

/**
 * メンバー拒否ユースケース
 *
 * メンバーレコードを削除する。
 * 権限チェックはミドルウェアで実施済みのため、ここでは行わない。
 */
export type RejectMemberCommand = (
  command: RejectMemberInput
) => Promise<Result<void, RejectMemberError>>;

export function createRejectMemberCommand(
  communityRepository: CommunityRepository,
  communityMemberRepository: CommunityMemberRepository
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

    return ok(undefined);
  };
}
