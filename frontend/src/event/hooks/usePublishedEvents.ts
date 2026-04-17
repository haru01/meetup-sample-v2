import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { ListEventsResponse, PublishedEvent } from "../types";

export const usePublishedEvents = () => {
  const [events, setEvents] = useState<PublishedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<ListEventsResponse>("/events");
    if (result.ok) {
      setEvents(result.data.events);
    } else {
      setError("イベント一覧の取得に失敗しました");
    }
    setLoading(false);
  }, []);

  return { events, loading, error, fetchEvents };
};
