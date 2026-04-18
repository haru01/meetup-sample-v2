// ============================================================
// Meetup ドメインイベント定義
// ============================================================

export type MeetupDomainEvent =
  | { type: 'EventPublished'; eventId: string }
  | { type: 'EventClosed'; eventId: string }
  | { type: 'EventCancelled'; eventId: string }
  | { type: 'ParticipationApplied'; participationId: string; eventId: string; accountId: string }
  | { type: 'ParticipationApproved'; participationId: string; eventId: string; accountId: string }
  | { type: 'ParticipationCancelled'; participationId: string; eventId: string }
  | { type: 'WaitlistPromoted'; participationId: string; eventId: string; accountId: string }
  | { type: 'EventDateApproached'; eventId: string };
