import { useState, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import type {
  CommunityMember,
  ListMembersResponse,
  MemberResponse,
} from "../types";

export const useMembers = () => {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listMembers = useCallback(async (communityId: string) => {
    setLoading(true);
    setError(null);
    const result = await apiClient.get<ListMembersResponse>(
      `/communities/${communityId}/members`,
    );
    if (result.ok) {
      setMembers(result.data.members);
    } else {
      setError("メンバー一覧の取得に失敗しました");
    }
    setLoading(false);
  }, []);

  const joinCommunity = useCallback(
    async (communityId: string, accountId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.post<MemberResponse>(
        `/communities/${communityId}/members`,
        { accountId },
      );
      if (result.ok) {
        setLoading(false);
        return true;
      }
      setError("コミュニティへの参加に失敗しました");
      setLoading(false);
      return false;
    },
    [],
  );

  const leaveCommunity = useCallback(
    async (communityId: string, memberId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.delete<void>(
        `/communities/${communityId}/members/${memberId}`,
      );
      if (result.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setLoading(false);
        return true;
      }
      setError("コミュニティからの退会に失敗しました");
      setLoading(false);
      return false;
    },
    [],
  );

  const approveMember = useCallback(
    async (communityId: string, memberId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.patch<MemberResponse>(
        `/communities/${communityId}/members/${memberId}/approve`,
        {},
      );
      if (result.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? result.data.member : m)),
        );
        setLoading(false);
        return true;
      }
      setError("メンバーの承認に失敗しました");
      setLoading(false);
      return false;
    },
    [],
  );

  const rejectMember = useCallback(
    async (communityId: string, memberId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      const result = await apiClient.patch<MemberResponse>(
        `/communities/${communityId}/members/${memberId}/reject`,
        {},
      );
      if (result.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        setLoading(false);
        return true;
      }
      setError("メンバーの拒否に失敗しました");
      setLoading(false);
      return false;
    },
    [],
  );

  return {
    members,
    loading,
    error,
    listMembers,
    joinCommunity,
    leaveCommunity,
    approveMember,
    rejectMember,
  };
};
