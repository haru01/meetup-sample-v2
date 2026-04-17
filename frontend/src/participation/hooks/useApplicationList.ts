import { useCallback, useState } from "react";
import { apiClient } from "../../lib/api-client";
import type { ApplicationListItem, ListApplicationsResponse } from "../types";

export const useApplicationList = () => {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (eventId: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<ListApplicationsResponse>(
      `/events/${eventId}/participations`,
    );
    if (result.ok) {
      setApplications(result.data.participations);
    } else {
      setError("申し込み一覧の取得に失敗しました");
    }
    setLoading(false);
  }, []);

  return { applications, loading, error, fetchApplications };
};
