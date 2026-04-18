import { useState, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import type { Event, EventResponse, CreateEventRequest } from "../types";

type CommunityEvent = Pick<
  Event,
  | "id"
  | "communityId"
  | "title"
  | "status"
  | "startsAt"
  | "endsAt"
  | "format"
  | "capacity"
>;
type ListCommunityEventsResponse = { events: CommunityEvent[]; total?: number };

export const useEvents = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communityEvents, setCommunityEvents] = useState<CommunityEvent[]>([]);

  const createEvent = useCallback(
    async (
      communityId: string,
      data: CreateEventRequest,
    ): Promise<Event | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<EventResponse>(
        `/communities/${communityId}/events`,
        data,
      );
      if (result.ok) {
        setLoading(false);
        return result.data.event;
      }
      setError("イベントの作成に失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  const listCommunityEvents = useCallback(
    async (communityId: string): Promise<void> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.get<ListCommunityEventsResponse>(
        `/communities/${communityId}/events`,
      );
      if (result.ok) {
        setCommunityEvents(result.data.events);
      } else {
        setError("イベント一覧の取得に失敗しました");
      }
      setLoading(false);
    },
    [],
  );

  return { createEvent, listCommunityEvents, communityEvents, loading, error };
};
