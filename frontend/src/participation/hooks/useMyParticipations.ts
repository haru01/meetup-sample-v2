import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type {
  ListMyParticipationsResponse,
  ParticipationWithEvent,
} from "../types";

export const useMyParticipations = () => {
  const [participations, setParticipations] = useState<ParticipationWithEvent[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyParticipations = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<ListMyParticipationsResponse>(
      "/participations/my",
    );
    if (result.ok) {
      setParticipations(result.data.participations);
    } else {
      setError("参加履歴の取得に失敗しました");
    }
    setLoading(false);
  }, []);

  return { participations, loading, error, fetchMyParticipations };
};
