import { z } from 'zod';
import {
  AccountIdSchema,
  CommunityIdSchema,
  CommunityMemberIdSchema,
} from '@shared/schemas/common';

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

// ============================================================
// コミュニティメンバー集約スキーマ
// ============================================================

export const CommunityMemberSchema = z.object({
  id: CommunityMemberIdSchema,
  communityId: CommunityIdSchema,
  accountId: AccountIdSchema,
  role: CommunityMemberRoleSchema,
  status: CommunityMemberStatusSchema,
  createdAt: z.date(),
});
export type CommunityMember = z.infer<typeof CommunityMemberSchema>;
