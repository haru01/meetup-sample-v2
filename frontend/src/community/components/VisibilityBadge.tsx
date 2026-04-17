import type { Visibility } from "../types";
import { getVisibilityLabel } from "../utils/label-utils";

type VisibilityBadgeProps = {
  visibility: Visibility;
};

export const VisibilityBadge = ({ visibility }: VisibilityBadgeProps) => (
  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
    {getVisibilityLabel(visibility)}
  </span>
);
