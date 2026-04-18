import type { AccountId, EventId } from '@shared/schemas/common';
import type { ParticipationId } from '@/participation/models/schemas/participation.schema';

// ============================================================
// Meetup ドメインイベント定義
// ============================================================

export type MeetupDomainEvent =
  | { type: 'EventPublished'; eventId: EventId }
  | { type: 'EventClosed'; eventId: EventId }
  | { type: 'EventCancelled'; eventId: EventId }
  | {
      type: 'ParticipationApplied';
      participationId: ParticipationId;
      eventId: EventId;
      accountId: AccountId;
    }
  | {
      type: 'ParticipationApproved';
      participationId: ParticipationId;
      eventId: EventId;
      accountId: AccountId;
    }
  | { type: 'ParticipationCancelled'; participationId: ParticipationId; eventId: EventId }
  | {
      type: 'WaitlistPromoted';
      participationId: ParticipationId;
      eventId: EventId;
      accountId: AccountId;
    }
  | { type: 'EventDateApproached'; eventId: EventId };
