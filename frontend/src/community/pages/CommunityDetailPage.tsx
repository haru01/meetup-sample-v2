import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useCommunities } from "../hooks/useCommunities";
import { useMembers } from "../hooks/useMembers";
import { useEvents } from "../hooks/useEvents";
import { useAuth } from "../../auth/hooks/useAuth";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { CategoryBadge } from "../components/CategoryBadge";
import { VisibilityBadge } from "../components/VisibilityBadge";
import { MemberCard } from "../components/MemberCard";

export const CommunityDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    community,
    loading: communityLoading,
    error: communityError,
    getCommunity,
  } = useCommunities();
  const {
    members,
    loading: membersLoading,
    error: membersError,
    listMembers,
    joinCommunity,
    leaveCommunity,
    approveMember,
    rejectMember,
  } = useMembers();
  const { listCommunityEvents, communityEvents } = useEvents();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (id) {
      getCommunity(id);
      listMembers(id);
      listCommunityEvents(id);
    }
  }, [id, getCommunity, listMembers, listCommunityEvents]);

  if (communityLoading) return <p>読み込み中...</p>;
  if (communityError) return <p className="text-red-600">{communityError}</p>;
  if (!community) return <p>コミュニティが見つかりません</p>;

  const isOwner = members.some(
    (m) => m.accountId === user?.id && m.role === "OWNER",
  );
  const isAdmin = members.some(
    (m) => m.accountId === user?.id && m.role === "ADMIN",
  );
  const canManageEvents = isOwner || isAdmin;
  const currentMember = members.find((m) => m.accountId === user?.id);

  const handleJoin = async () => {
    if (id && user) {
      const success = await joinCommunity(id, user.id);
      if (success) listMembers(id);
    }
  };

  const handleLeave = async () => {
    if (id && currentMember) {
      const success = await leaveCommunity(id, currentMember.id);
      if (success) listMembers(id);
    }
  };

  const handleApprove = async (memberId: string) => {
    if (id) await approveMember(id, memberId);
  };

  const handleReject = async (memberId: string) => {
    if (id) await rejectMember(id, memberId);
  };

  return (
    <div>
      <Card className="mb-6">
        <h1 className="text-2xl font-bold">{community.name}</h1>
        <p className="mt-2 text-gray-600">{community.description}</p>
        <div className="mt-4 flex gap-2">
          <CategoryBadge category={community.category} />
          <VisibilityBadge visibility={community.visibility} />
        </div>

        {isAuthenticated && !isOwner && !currentMember && (
          <Button onClick={handleJoin} className="mt-4">
            参加する
          </Button>
        )}
        {isAuthenticated && currentMember && !isOwner && (
          <Button onClick={handleLeave} variant="danger" className="mt-4">
            退会する
          </Button>
        )}
        {canManageEvents && (
          <Button
            onClick={() => navigate(`/communities/${id}/events/new`)}
            className="mt-4 ml-2"
          >
            イベント作成
          </Button>
        )}
      </Card>

      <h2 className="mb-4 text-xl font-semibold">イベント一覧</h2>
      <div className="mb-6 space-y-2">
        {communityEvents.length === 0 && <p className="text-gray-500">イベントはありません</p>}
        {communityEvents.map((ev) => (
          <Card key={ev.id} className="flex items-center justify-between">
            <Link to={`/events/${ev.id}`} className="font-medium text-blue-600 hover:underline">
              {ev.title}
            </Link>
            <span className="text-sm text-gray-500">{ev.status}</span>
          </Card>
        ))}
      </div>

      <h2 className="mb-4 text-xl font-semibold">メンバー一覧</h2>
      {membersLoading && <p>読み込み中...</p>}
      {membersError && <p className="text-red-600">{membersError}</p>}

      <div className="space-y-3">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            isOwner={isOwner}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    </div>
  );
};
