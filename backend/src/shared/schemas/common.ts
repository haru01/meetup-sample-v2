import { z } from 'zod';

// ============================================================
// 共通ID スキーマ (Zod Branded Types)
// ============================================================

/** アカウントIDスキーマ - UUID 形式のアカウント識別子 */
export const AccountIdSchema = z.string().uuid().brand<'AccountId'>();
/** コミュニティIDスキーマ - UUID 形式のコミュニティ識別子 */
export const CommunityIdSchema = z.string().uuid().brand<'CommunityId'>();
/** コミュニティメンバーIDスキーマ - UUID 形式のコミュニティメンバー識別子 */
export const CommunityMemberIdSchema = z.string().uuid().brand<'CommunityMemberId'>();
/** イベントIDスキーマ - UUID 形式のイベント識別子 */
export const EventIdSchema = z.string().uuid().brand<'EventId'>();

/** アカウントID */
export type AccountId = z.infer<typeof AccountIdSchema>;
/** コミュニティID */
export type CommunityId = z.infer<typeof CommunityIdSchema>;
/** コミュニティメンバーID */
export type CommunityMemberId = z.infer<typeof CommunityMemberIdSchema>;
/** イベントID */
export type EventId = z.infer<typeof EventIdSchema>;
