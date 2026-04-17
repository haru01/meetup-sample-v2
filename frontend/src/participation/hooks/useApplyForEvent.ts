import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { Participation, ParticipationResponse } from "../types";

export const useApplyForEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    async (eventId: string): Promise<Participation | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<ParticipationResponse>(
        `/events/${eventId}/participations`,
        {},
      );
      if (result.ok) {
        setLoading(false);
        return result.data.participation;
      }
      setError("参加申し込みに失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  return { apply, loading, error };
};
