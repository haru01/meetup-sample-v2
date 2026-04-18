import { z } from 'zod';
import { CommunityIdSchema } from '@shared/schemas/common';

// ============================================================
// コミュニティカテゴリスキーマ
// ============================================================

export const CommunityCategorySchema = z.enum(['TECH', 'BUSINESS', 'HOBBY']);
export type CommunityCategory = z.infer<typeof CommunityCategorySchema>;

/** コミュニティカテゴリ定数（スキーマから導出） */
export const CommunityCategory = CommunityCategorySchema.enum;

// ============================================================
// コミュニティ公開設定スキーマ
// ============================================================

export const CommunityVisibilitySchema = z.enum(['PUBLIC', 'PRIVATE']);
export type CommunityVisibility = z.infer<typeof CommunityVisibilitySchema>;

/** コミュニティ公開設定定数（スキーマから導出） */
export const CommunityVisibility = CommunityVisibilitySchema.enum;

// ============================================================
// コミュニティ名スキーマ
// ============================================================

export const CommunityNameSchema = z.string().min(1).max(100);
export type CommunityName = z.infer<typeof CommunityNameSchema>;

// ============================================================
// コミュニティ説明スキーマ
// ============================================================

export const CommunityDescriptionSchema = z.string().max(1000).nullable();
export type CommunityDescription = z.infer<typeof CommunityDescriptionSchema>;

// ============================================================
// コミュニティ集約スキーマ
// ============================================================

export const CommunitySchema = z.object({
  id: CommunityIdSchema,
  name: CommunityNameSchema,
  description: CommunityDescriptionSchema,
  category: CommunityCategorySchema,
  visibility: CommunityVisibilitySchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Community = z.infer<typeof CommunitySchema>;
