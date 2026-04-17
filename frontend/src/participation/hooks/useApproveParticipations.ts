import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { ApproveParticipationsResponse } from "../types";

export const useApproveParticipations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveAll = useCallback(
    async (eventId: string): Promise<number | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<ApproveParticipationsResponse>(
        `/events/${eventId}/participations/approve`,
        {},
      );
      if (result.ok) {
        setLoading(false);
        return result.data.approved;
      }
      setError("承認に失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  return { approveAll, loading, error };
};
