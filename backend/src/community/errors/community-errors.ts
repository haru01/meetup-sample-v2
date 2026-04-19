import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';

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

/**
 * メンバー参加ドメインイベント（PUBLIC コミュニティで ACTIVE 登録された場合）
 */
export type MemberJoinedEvent = {
  type: 'MemberJoined';
  communityId: CommunityId;
  accountId: AccountId;
  memberId: CommunityMemberId;
  occurredAt: Date;
};

/**
 * メンバー申請ドメインイベント（PRIVATE コミュニティで PENDING 登録された場合）
 */
export type MemberApplicationSubmittedEvent = {
  type: 'MemberApplicationSubmitted';
  communityId: CommunityId;
  accountId: AccountId;
  memberId: CommunityMemberId;
  occurredAt: Date;
};

/**
 * メンバー承認ドメインイベント
 */
export type MemberApprovedEvent = {
  type: 'MemberApproved';
  communityId: CommunityId;
  memberId: CommunityMemberId;
  accountId: AccountId;
  occurredAt: Date;
};

/**
 * メンバー拒否ドメインイベント
 */
export type MemberRejectedEvent = {
  type: 'MemberRejected';
  communityId: CommunityId;
  memberId: CommunityMemberId;
  accountId: AccountId;
  occurredAt: Date;
};

/**
 * メンバー脱退ドメインイベント
 */
export type MemberLeftEvent = {
  type: 'MemberLeft';
  communityId: CommunityId;
  memberId: CommunityMemberId;
  accountId: AccountId;
  occurredAt: Date;
};

/**
 * community BC のドメインイベント union
 * InMemoryEventBus<CommunityDomainEvent> の型引数として使用する
 */
export type CommunityDomainEvent =
  | CommunityCreatedEvent
  | MemberJoinedEvent
  | MemberApplicationSubmittedEvent
  | MemberApprovedEvent
  | MemberRejectedEvent
  | MemberLeftEvent;
