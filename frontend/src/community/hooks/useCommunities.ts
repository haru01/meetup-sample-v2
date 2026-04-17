import { useState, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import type {
  Community,
  ListCommunitiesResponse,
  CommunityResponse,
  CreateCommunityRequest,
} from "../types";

export const useCommunities = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<ListCommunitiesResponse>("/communities");
    if (result.ok) {
      setCommunities(result.data.communities);
    } else {
      setError("コミュニティの取得に失敗しました");
    }
    setLoading(false);
  }, []);

  const getCommunity = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<CommunityResponse>(`/communities/${id}`);
    if (result.ok) {
      setCommunity(result.data.community);
    } else {
      setError("コミュニティの取得に失敗しました");
    }
    setLoading(false);
  }, []);

  const createCommunity = useCallback(
    async (data: CreateCommunityRequest): Promise<Community | null> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<CommunityResponse>(
        "/communities",
        data,
      );
      if (result.ok) {
        setLoading(false);
        return result.data.community;
      }
      setError("コミュニティの作成に失敗しました");
      setLoading(false);
      return null;
    },
    [],
  );

  const getMyCommunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<ListCommunitiesResponse>(
      "/communities?member=me",
    );
    if (result.ok) {
      setCommunities(result.data.communities);
    } else {
      setError("マイコミュニティの取得に失敗しました");
    }
    setLoading(false);
  }, []);

  return {
    communities,
    community,
    loading,
    error,
    fetchCommunities,
    getCommunity,
    createCommunity,
    getMyCommunities,
  };
};
