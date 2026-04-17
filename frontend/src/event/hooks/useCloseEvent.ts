import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { EventDetailResponse, PublishedEvent } from "../types";

export const useCloseEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeEvent = useCallback(
    async (eventId: string): Promise<PublishedEvent | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<EventDetailResponse>(
        `/events/${eventId}/close`,
        {},
      );
      if (result.ok) {
        setLoading(false);
        return result.data.event;
      }
      setError("イベントのクローズに失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  return { closeEvent, loading, error };
};
