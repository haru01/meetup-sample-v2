import { NotificationType } from '../../models/schemas/notification.schema';
import type { NotificationRepository } from '../../repositories/notification.repository';

// ============================================================
// 主催者通知送信ユースケース（NotifyOrganizerOnCancel POLICY の実装）
// ============================================================

export interface NotifyOrganizerInput {
  readonly participationId: string;
  readonly eventId: string;
  readonly organizerId: string;
}

export type NotifyOrganizerCommand = (input: NotifyOrganizerInput) => Promise<void>;

export function createNotifyOrganizerCommand(
  notificationRepository: NotificationRepository
): NotifyOrganizerCommand {
  return async ({ participationId, eventId, organizerId }) => {
    await notificationRepository.create(
      NotificationType.PARTICIPANT_CANCELLED,
      organizerId,
      JSON.stringify({ participationId, eventId })
    );
  };
}
