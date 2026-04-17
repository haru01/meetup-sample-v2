import { useEffect } from "react";
import { useCommunities } from "../hooks/useCommunities";
import { CommunityCard } from "../components/CommunityCard";

export const MyCommunitiesPage = () => {
  const { communities, loading, error, getMyCommunities } = useCommunities();

  useEffect(() => {
    getMyCommunities();
  }, [getMyCommunities]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">マイコミュニティ</h1>

      {loading && <p>読み込み中...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && communities.length === 0 && (
        <p className="text-gray-500">参加しているコミュニティがありません</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((community) => (
          <CommunityCard key={community.id} community={community} />
        ))}
      </div>
    </div>
  );
};
