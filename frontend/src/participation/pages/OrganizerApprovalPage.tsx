import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useEventDetail } from "../../event/hooks/useEventDetail";
import { useApplicationList } from "../hooks/useApplicationList";
import { useApproveParticipations } from "../hooks/useApproveParticipations";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { ErrorAlert } from "../../components/ErrorAlert";
import type { ParticipationStatus } from "../types";

const statusLabels: Record<ParticipationStatus, string> = {
  APPLIED: "申込中",
  APPROVED: "承認済み",
  WAITLISTED: "キャンセル待ち",
  CANCELLED: "キャンセル済み",
};

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const OrganizerApprovalPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, authLoading } = useAuth();
  const { event, fetchEvent } = useEventDetail();
  const { applications, loading, error, fetchApplications } =
    useApplicationList();
  const { approveAll, loading: approving, error: approveError } =
    useApproveParticipations();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
      fetchApplications(id);
    }
  }, [id, fetchEvent, fetchApplications]);

  if (authLoading) return <p>読み込み中...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (event && user && event.createdBy !== user.id) {
    return (
      <Card>
        <p className="text-red-600">このページへのアクセス権がありません</p>
      </Card>
    );
  }

  const handleApproveAll = async () => {
    if (!id) return;
    const count = await approveAll(id);
    if (count !== null) {
      setMessage(`${count}件を承認しました`);
      await fetchApplications(id);
    }
  };

  const appliedCount = applications.filter((a) => a.status === "APPLIED").length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">申し込み一覧</h1>
      {event && <p className="mb-6 text-gray-600">{event.title}</p>}

      <ErrorAlert message={error} />
      <ErrorAlert message={approveError} />
      {message && <p className="mb-4 text-sm text-green-600">{message}</p>}

      <div className="mb-4">
        <Button
          onClick={handleApproveAll}
          loading={approving}
          disabled={appliedCount === 0}
        >
          全員承認（{appliedCount}件）
        </Button>
      </div>

      {loading && <p>読み込み中...</p>}

      {!loading && applications.length === 0 && !error && (
        <p className="text-gray-500">申し込みはありません</p>
      )}

      <div className="space-y-3">
        {applications.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {a.accountName ?? a.accountId}
                </p>
                <p className="text-sm text-gray-600">
                  申し込み日時: {formatDateTime(a.appliedAt)}
                </p>
              </div>
              <span className="text-sm text-gray-700">
                {statusLabels[a.status]}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
