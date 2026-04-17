import { useNavigate } from "react-router-dom";
import { useCommunities } from "../hooks/useCommunities";
import { Card } from "../../components/Card";
import { CommunityCreateForm } from "../components/CommunityCreateForm";
import type { CreateCommunityRequest } from "../types";

export const CommunityCreatePage = () => {
  const navigate = useNavigate();
  const { createCommunity, loading, error } = useCommunities();

  const handleSubmit = async (data: CreateCommunityRequest) => {
    const community = await createCommunity(data);
    if (community) {
      navigate(`/communities/${community.id}`);
    }
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-lg">
        <h1 className="mb-6 text-2xl font-bold">コミュニティ作成</h1>
        <CommunityCreateForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </Card>
    </div>
  );
};
