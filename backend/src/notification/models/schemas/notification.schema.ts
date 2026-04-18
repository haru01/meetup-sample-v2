import { z } from 'zod';

// ============================================================
// 通知タイプスキーマ
// ============================================================

export const NotificationTypeSchema = z.enum([
  'APPROVAL',
  'REMINDER',
  'SURVEY',
  'EVENT_CANCELLED',
  'PARTICIPANT_CANCELLED',
  'WAITLIST_PROMOTED',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/** 通知タイプ定数（スキーマから導出） */
export const NotificationType = NotificationTypeSchema.enum;

// ============================================================
// NotificationId スキーマ（Zod Branded Type）
// ============================================================

export const NotificationIdSchema = z.string().uuid().brand<'NotificationId'>();
export type NotificationId = z.infer<typeof NotificationIdSchema>;

// ============================================================
// Notification 集約スキーマ
// ============================================================

export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  type: NotificationTypeSchema,
  recipientId: z.string(),
  payload: z.string(),
  sentAt: z.date(),
});
export type Notification = z.infer<typeof NotificationSchema>;
