import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { EventDetailResponse, PublishedEvent } from "../types";

export const useCancelEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelEvent = useCallback(
    async (eventId: string): Promise<PublishedEvent | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<EventDetailResponse>(
        `/events/${eventId}/cancel`,
        {},
      );
      if (result.ok) {
        setLoading(false);
        return result.data.event;
      }
      setError("イベントの中止に失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  return { cancelEvent, loading, error };
};
