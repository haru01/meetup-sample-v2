import { z } from 'zod';

// ============================================================
// イベントタイトルスキーマ
// ============================================================

export const EventTitleSchema = z.string().min(1).max(100);
export type EventTitle = z.infer<typeof EventTitleSchema>;

// ============================================================
// イベント説明スキーマ
// ============================================================

export const EventDescriptionSchema = z.string().max(1000).nullable();
export type EventDescription = z.infer<typeof EventDescriptionSchema>;

// ============================================================
// イベント開催形式スキーマ
// ============================================================

export const EventFormatSchema = z.enum(['ONLINE', 'OFFLINE', 'HYBRID']);
export type EventFormat = z.infer<typeof EventFormatSchema>;

/** イベント開催形式定数（スキーマから導出） */
export const EventFormat = EventFormatSchema.enum;

// ============================================================
// イベントステータススキーマ
// ============================================================

export const EventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED']);
export type EventStatus = z.infer<typeof EventStatusSchema>;

/** イベントステータス定数（スキーマから導出） */
export const EventStatus = EventStatusSchema.enum;

// ============================================================
// イベント定員スキーマ
// ============================================================

export const EventCapacitySchema = z.number().int().min(1).max(1000);
export type EventCapacity = z.infer<typeof EventCapacitySchema>;
