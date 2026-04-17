import { z } from 'zod';

// ============================================================
// CheckInId スキーマ（Branded Type）
// ============================================================

export const CheckInIdSchema = z.string().uuid();
export type CheckInId = string & { readonly __brand: 'CheckInId' };
