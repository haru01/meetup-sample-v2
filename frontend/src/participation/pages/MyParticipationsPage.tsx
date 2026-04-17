import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useMyParticipations } from "../hooks/useMyParticipations";
import { useCancelParticipation } from "../hooks/useCancelParticipation";
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

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const MyParticipationsPage = () => {
  const { isAuthenticated, authLoading } = useAuth();
  const { participations, loading, error, fetchMyParticipations } =
    useMyParticipations();
  const { cancel, loading: cancelling, error: cancelError } =
    useCancelParticipation();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) fetchMyParticipations();
  }, [isAuthenticated, fetchMyParticipations]);

  if (authLoading) return <p>読み込み中...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleCancel = async (participationId: string) => {
    const ok = await cancel(participationId);
    if (ok) {
      setMessage("キャンセルしました");
      await fetchMyParticipations();
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">参加履歴</h1>

      <ErrorAlert message={error} />
      <ErrorAlert message={cancelError} />
      {message && <p className="mb-4 text-sm text-green-600">{message}</p>}

      {loading && <p>読み込み中...</p>}

      {!loading && participations.length === 0 && !error && (
        <p className="text-gray-500">参加履歴がありません</p>
      )}

      <div className="space-y-3">
        {participations.map((p) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {p.eventTitle ?? `イベント ${p.eventId}`}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  ステータス: {statusLabels[p.status]}
                </p>
                <p className="text-sm text-gray-600">
                  申し込み日: {formatDate(p.appliedAt)}
                </p>
                {p.eventStartsAt && (
                  <p className="text-sm text-gray-600">
                    開催日: {formatDate(p.eventStartsAt)}
                  </p>
                )}
              </div>
              {(p.status === "APPLIED" || p.status === "APPROVED") && (
                <Button
                  variant="danger"
                  onClick={() => handleCancel(p.id)}
                  loading={cancelling}
                >
                  キャンセル
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
