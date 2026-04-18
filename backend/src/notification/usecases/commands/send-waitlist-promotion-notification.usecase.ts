import { NotificationType } from '../../models/schemas/notification.schema';
import type { NotificationRepository } from '../../repositories/notification.repository';

// ============================================================
// 繰り上げ通知送信ユースケース（NotifyWaitlistPromotion POLICY の実装）
// ============================================================

export interface SendWaitlistPromotionNotificationInput {
  readonly participationId: string;
  readonly eventId: string;
  readonly accountId: string;
}

export type SendWaitlistPromotionNotificationCommand = (
  input: SendWaitlistPromotionNotificationInput
) => Promise<void>;

export function createSendWaitlistPromotionNotificationCommand(
  notificationRepository: NotificationRepository
): SendWaitlistPromotionNotificationCommand {
  return async ({ participationId, eventId, accountId }) => {
    await notificationRepository.create(
      NotificationType.WAITLIST_PROMOTED,
      accountId,
      JSON.stringify({ participationId, eventId })
    );
  };
}
