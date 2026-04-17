import { ok, err, type Result } from '@shared/result';
import type { CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { CommunityMember } from '../../models/community-member';
import { approveMember } from '../../models/community-member';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../repositories/community-member.repository';
import type { ApproveMemberError } from '../../errors/community-errors';

// ============================================================
// メンバー承認コマンド
// ============================================================

export interface ApproveMemberInput {
  readonly communityId: CommunityId;
  readonly targetMemberId: CommunityMemberId;
}

// ============================================================
// メンバー承認ユースケース
// ============================================================

/**
 * メンバー承認ユースケース
 *
 * PENDING → ACTIVE に遷移する。
 * 権限チェックはミドルウェアで実施済みのため、ここでは行わない。
 */
export type ApproveMemberCommand = (
  command: ApproveMemberInput
) => Promise<Result<CommunityMember, ApproveMemberError>>;

export function createApproveMemberCommand(
  communityRepository: CommunityRepository,
  communityMemberRepository: CommunityMemberRepository
): ApproveMemberCommand {
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

    // ドメインモデルで承認（PENDING → ACTIVE）
    const approveResult = approveMember(targetMember);
    if (!approveResult.ok) {
      return approveResult;
    }

    // 保存
    await communityMemberRepository.save(approveResult.value);

    return ok(approveResult.value);
  };
}
