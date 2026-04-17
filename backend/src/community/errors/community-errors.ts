import type { AccountId, CommunityId } from '@shared/schemas/common';

// ============================================================
// Meetupコンテキスト - エラー型定義
// ============================================================

/**
 * コミュニティ作成エラー（Discriminated Union）
 */
export type CreateCommunityError =
  | { type: 'DuplicateCommunityName'; name: string }
  | { type: 'TooManyCommunities' };

/**
 * コミュニティ参加エラー
 */
export type JoinCommunityError = { type: 'CommunityNotFound' } | { type: 'AlreadyMember' };

/**
 * コミュニティ脱退エラー
 */
export type LeaveCommunityError =
  | { type: 'CommunityNotFound' }
  | { type: 'MemberNotFound' }
  | { type: 'OwnerCannotLeave' };

/**
 * メンバー承認エラー
 */
export type ApproveMemberError =
  | { type: 'CommunityNotFound' }
  | { type: 'MemberNotFound' }
  | { type: 'MemberAlreadyActive' };

/**
 * メンバー拒否エラー
 */
export type RejectMemberError = { type: 'CommunityNotFound' } | { type: 'MemberNotFound' };

/**
 * コミュニティ取得エラー
 */
export type GetCommunityError = { type: 'CommunityNotFound' };

/**
 * メンバー一覧取得エラー
 */
export type ListMembersError = { type: 'CommunityNotFound' };

/**
 * コミュニティ一覧取得エラー
 */
export type ListCommunitiesError = never;

/**
 * コミュニティ作成ドメインイベント
 */
export type CommunityCreatedEvent = {
  type: 'CommunityCreated';
  communityId: CommunityId;
  accountId: AccountId;
  name: string;
  occurredAt: Date;
};
