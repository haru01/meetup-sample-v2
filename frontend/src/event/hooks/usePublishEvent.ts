import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { EventDetailResponse, PublishedEvent } from "../types";

export const usePublishEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishEvent = useCallback(
    async (eventId: string): Promise<PublishedEvent | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.put<EventDetailResponse>(
        `/events/${eventId}/publish`,
        {},
      );
      if (result.ok) {
        setLoading(false);
        return result.data.event;
      }
      setError("イベントの公開に失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  return { publishEvent, loading, error };
};
