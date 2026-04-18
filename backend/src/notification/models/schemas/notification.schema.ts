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
// NotificationId スキーマ（Branded Type）
// ============================================================

export const NotificationIdSchema = z.string().uuid();
export type NotificationId = string & { readonly __brand: 'NotificationId' };
