import { z } from 'zod';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';

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

// ============================================================
// イベント集約スキーマ
// ============================================================

export const EventSchema = z.object({
  id: z.custom<EventId>((v) => typeof v === 'string'),
  communityId: z.custom<CommunityId>((v) => typeof v === 'string'),
  createdBy: z.custom<AccountId>((v) => typeof v === 'string'),
  title: EventTitleSchema,
  description: EventDescriptionSchema,
  startsAt: z.date(),
  endsAt: z.date(),
  format: EventFormatSchema,
  capacity: EventCapacitySchema,
  status: EventStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Event = z.infer<typeof EventSchema>;
