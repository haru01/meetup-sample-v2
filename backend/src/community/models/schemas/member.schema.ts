import { z } from 'zod';

// ============================================================
// コミュニティメンバーロールスキーマ
// ============================================================

export const CommunityMemberRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export type CommunityMemberRole = z.infer<typeof CommunityMemberRoleSchema>;

/** コミュニティメンバーロール定数（スキーマから導出） */
export const CommunityMemberRole = CommunityMemberRoleSchema.enum;

// ============================================================
// コミュニティメンバーステータススキーマ
// ============================================================

export const CommunityMemberStatusSchema = z.enum(['PENDING', 'ACTIVE']);
export type CommunityMemberStatus = z.infer<typeof CommunityMemberStatusSchema>;

/** コミュニティメンバーステータス定数（スキーマから導出） */
export const CommunityMemberStatus = CommunityMemberStatusSchema.enum;
