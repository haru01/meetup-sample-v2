import { useEffect, useState } from "react";
import { useCommunities } from "../hooks/useCommunities";
import { CommunityCard } from "../components/CommunityCard";
import {
  CATEGORIES,
  getCategoryLabel,
  filterCommunitiesByCategory,
} from "../utils/label-utils";
import type { Category } from "../types";

export const CommunityListPage = () => {
  const { communities, loading, error, fetchCommunities } = useCommunities();
  const [categoryFilter, setCategoryFilter] = useState<Category | "">("");

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const filtered = filterCommunitiesByCategory(communities, categoryFilter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">コミュニティ一覧</h1>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as Category | "")}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          aria-label="カテゴリフィルター"
        >
          <option value="">すべてのカテゴリ</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>読み込み中...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-gray-500">コミュニティが見つかりません</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((community) => (
          <CommunityCard key={community.id} community={community} showBadges />
        ))}
      </div>
    </div>
  );
};
