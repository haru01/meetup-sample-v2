import type { Category, Community, Visibility } from "../types";

export const CATEGORIES: Category[] = ["TECH", "BUSINESS", "HOBBY"];

const CATEGORY_LABELS: Record<Category, string> = {
  TECH: "テクノロジー",
  BUSINESS: "ビジネス",
  HOBBY: "趣味",
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: "公開",
  PRIVATE: "非公開",
};

export const getCategoryLabel = (category: Category): string =>
  CATEGORY_LABELS[category];

export const getVisibilityLabel = (visibility: Visibility): string =>
  VISIBILITY_LABELS[visibility];

export const filterCommunitiesByCategory = (
  communities: readonly Community[],
  category: Category | "",
): Community[] =>
  category
    ? communities.filter((c) => c.category === category)
    : [...communities];
