import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { RemainingCapacity } from "../types";

export const useRemainingCapacity = () => {
  const [capacity, setCapacity] = useState<RemainingCapacity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCapacity = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<RemainingCapacity>(
      `/events/${eventId}/capacity`,
    );
    if (result.ok) {
      setCapacity(result.data);
    } else {
      setError("残席数の取得に失敗しました");
    }
    setLoading(false);
  }, []);

  return { capacity, loading, error, fetchCapacity };
};
