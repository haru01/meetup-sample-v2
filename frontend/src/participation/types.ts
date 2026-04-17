export type ParticipationStatus =
  | "APPLIED"
  | "APPROVED"
  | "WAITLISTED"
  | "CANCELLED";

export type Participation = {
  readonly id: string;
  readonly eventId: string;
  readonly accountId: string;
  readonly status: ParticipationStatus;
  readonly appliedAt: string;
};

export type ParticipationWithEvent = Participation & {
  readonly eventTitle?: string;
  readonly eventStartsAt?: string;
};

export type ApplicationListItem = Participation & {
  readonly accountName?: string;
};

export type ParticipationResponse = {
  participation: Participation;
};

export type ListParticipationsResponse = {
  participations: Participation[];
};

export type ListMyParticipationsResponse = {
  participations: ParticipationWithEvent[];
};

export type ListApplicationsResponse = {
  participations: ApplicationListItem[];
};

export type ApproveParticipationsResponse = {
  approved: number;
};

export type CheckInResponse = {
  checkin: {
    id: string;
    participationId: string;
    eventId: string;
    accountId: string;
    checkedInAt: string;
  };
};
