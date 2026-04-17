import type { CommunityMember } from '../models/community-member';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';

// ============================================================
// CommunityMemberRepository インターフェース
// ============================================================

export interface CommunityMemberRepository {
  /**
   * communityId と accountId の複合キーでメンバーを取得
   */
  findByIds(communityId: CommunityId, accountId: AccountId): Promise<CommunityMember | null>;

  /**
   * IDでメンバーを取得
   */
  findById(id: CommunityMemberId): Promise<CommunityMember | null>;

  /**
   * メンバーを保存（upsert）
   */
  save(member: CommunityMember): Promise<void>;

  /**
   * メンバーを削除
   */
  delete(id: CommunityMemberId): Promise<void>;

  /**
   * コミュニティIDでアクティブメンバー一覧を取得（ACTIVE のみ）
   */
  findByCommunityId(
    communityId: CommunityId,
    options: { limit: number; offset: number }
  ): Promise<{ members: CommunityMember[]; total: number }>;
}
