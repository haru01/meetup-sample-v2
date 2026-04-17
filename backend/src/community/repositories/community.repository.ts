import type { Community } from '../models/community';
import type { AccountId, CommunityId } from '@shared/schemas/common';
import type { CommunityVisibility } from '../models/schemas/community.schema';

// ============================================================
// CommunityRepository インターフェース
// ============================================================

export interface CommunityRepository {
  /**
   * IDでコミュニティを取得
   */
  findById(id: CommunityId): Promise<Community | null>;

  /**
   * 名前でコミュニティを取得
   */
  findByName(name: string): Promise<Community | null>;

  /**
   * コミュニティを保存（upsert）
   */
  save(community: Community): Promise<void>;

  /**
   * コミュニティ一覧を取得
   * memberAccountId が指定された場合は ACTIVE メンバーのコミュニティのみ返す
   * visibility が指定された場合は該当する公開設定のコミュニティのみ返す
   */
  findAll(options: {
    category?: string;
    memberAccountId?: AccountId;
    visibility?: CommunityVisibility;
    limit: number;
    offset: number;
  }): Promise<{ communities: Community[]; total: number }>;

  /**
   * アカウントがオーナーのコミュニティ数を取得（CommunityMember の OWNER ロールで集計）
   */
  countByOwnerAccountId(accountId: AccountId): Promise<number>;
}
