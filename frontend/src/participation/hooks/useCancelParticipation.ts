import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";

export const useCancelParticipation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(
    async (participationId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.delete<void>(
        `/participations/${participationId}`,
      );
      if (result.ok) {
        setLoading(false);
        return true;
      }
      setError("キャンセルに失敗しました");
      setLoading(false);
      return false;
    },
    [],
  );

  return { cancel, loading, error };
};
