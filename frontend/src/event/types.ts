export type EventFormat = "ONLINE" | "OFFLINE" | "HYBRID";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";

export type PublishedEvent = {
  readonly id: string;
  readonly communityId: string;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly format: EventFormat;
  readonly capacity: number;
  readonly status: EventStatus;
  readonly createdBy: string;
};

export type RemainingCapacity = {
  readonly remaining: number;
  readonly capacity: number;
  readonly approved: number;
};

export type ListEventsResponse = {
  events: PublishedEvent[];
  total?: number;
};

export type EventDetailResponse = {
  event: PublishedEvent;
};
