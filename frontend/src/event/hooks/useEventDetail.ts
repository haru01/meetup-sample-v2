import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { EventDetailResponse, PublishedEvent } from "../types";

export const useEventDetail = () => {
  const [event, setEvent] = useState<PublishedEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<EventDetailResponse>(`/events/${id}`);
    if (result.ok) {
      setEvent(result.data.event);
    } else {
      setError("イベントの取得に失敗しました");
    }
    setLoading(false);
  }, []);

  return { event, loading, error, fetchEvent };
};
