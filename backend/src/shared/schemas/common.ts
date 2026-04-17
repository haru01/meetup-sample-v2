// ============================================================
// 共通ID型 (Branded Types)
// ============================================================

/** アカウントID - アカウントを一意に識別するUUID */
export type AccountId = string & { readonly __brand: 'AccountId' };
/** コミュニティID - コミュニティを一意に識別するUUID */
export type CommunityId = string & { readonly __brand: 'CommunityId' };
/** コミュニティメンバーID - コミュニティメンバーを一意に識別するUUID */
export type CommunityMemberId = string & { readonly __brand: 'CommunityMemberId' };
/** イベントID - イベントを一意に識別するUUID */
export type EventId = string & { readonly __brand: 'EventId' };
