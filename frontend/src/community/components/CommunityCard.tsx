import { Link } from "react-router-dom";
import { Card } from "../../components/Card";
import type { Community } from "../types";
import { CategoryBadge } from "./CategoryBadge";
import { VisibilityBadge } from "./VisibilityBadge";

type CommunityCardProps = {
  community: Community;
  showBadges?: boolean;
};

export const CommunityCard = ({
  community,
  showBadges = false,
}: CommunityCardProps) => (
  <Link to={`/communities/${community.id}`}>
    <Card className="hover:shadow-md transition-shadow">
      <h2 className="text-lg font-semibold">{community.name}</h2>
      <p className="mt-1 text-sm text-gray-600">{community.description}</p>
      {showBadges && (
        <div className="mt-3 flex gap-2">
          <CategoryBadge category={community.category} />
          <VisibilityBadge visibility={community.visibility} />
        </div>
      )}
    </Card>
  </Link>
);
