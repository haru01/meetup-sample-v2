import type { Category } from "../types";
import { getCategoryLabel } from "../utils/label-utils";

type CategoryBadgeProps = {
  category: Category;
};

export const CategoryBadge = ({ category }: CategoryBadgeProps) => (
  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
    {getCategoryLabel(category)}
  </span>
);
