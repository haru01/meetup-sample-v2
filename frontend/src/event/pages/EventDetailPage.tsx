import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { ErrorAlert } from "../../components/ErrorAlert";
import { useEventDetail } from "../hooks/useEventDetail";
import { useRemainingCapacity } from "../hooks/useRemainingCapacity";
import { usePublishEvent } from "../hooks/usePublishEvent";
import { useCloseEvent } from "../hooks/useCloseEvent";
import { useCancelEvent } from "../hooks/useCancelEvent";
import { useApplyForEvent } from "../../participation/hooks/useApplyForEvent";
import { useCancelParticipation } from "../../participation/hooks/useCancelParticipation";
import { useMyParticipations } from "../../participation/hooks/useMyParticipations";
import type { ParticipationStatus } from "../../participation/types";

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

export const EventDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, authLoading } = useAuth();
  const { event, loading, error, fetchEvent } = useEventDetail();
  const { capacity, fetchCapacity } = useRemainingCapacity();
  const { publishEvent, loading: publishing } = usePublishEvent();
  const { closeEvent, loading: closing } = useCloseEvent();
  const { cancelEvent, loading: cancelling } = useCancelEvent();
  const { apply, loading: applying, error: applyError } = useApplyForEvent();
  const { cancel: cancelParticipation, loading: cancellingParticipation } =
    useCancelParticipation();
  const { participations, fetchMyParticipations } = useMyParticipations();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEvent(id);
      fetchCapacity(id);
    }
  }, [id, fetchEvent, fetchCapacity]);

  useEffect(() => {
    if (isAuthenticated) fetchMyParticipations();
  }, [isAuthenticated, fetchMyParticipations]);

  if (authLoading || loading) return <p>読み込み中...</p>;
  if (error) return <ErrorAlert message={error} />;
  if (!event) return <p>イベントが見つかりません</p>;

  const myParticipation = participations.find(
    (p) => p.eventId === event.id && p.status !== "CANCELLED",
  );
  const isOrganizer = user?.id === event.createdBy;

  const refresh = async () => {
    if (id) {
      await fetchEvent(id);
      await fetchCapacity(id);
      if (isAuthenticated) await fetchMyParticipations();
    }
  };

  const handleApply = async () => {
    if (!id) return;
    const result = await apply(id);
    if (result) {
      setActionMessage("参加申し込みが完了しました");
      await refresh();
    }
  };

  const handleCancelParticipation = async () => {
    if (!myParticipation) return;
    const ok = await cancelParticipation(myParticipation.id);
    if (ok) {
      setActionMessage("キャンセルしました");
      await refresh();
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    const result = await publishEvent(id);
    if (result) {
      setActionMessage("イベントを公開しました");
      await refresh();
    }
  };

  const handleClose = async () => {
    if (!id) return;
    const result = await closeEvent(id);
    if (result) {
      setActionMessage("イベントをクローズしました");
      await refresh();
    }
  };

  const handleCancelEvent = async () => {
    if (!id) return;
    const result = await cancelEvent(id);
    if (result) {
      setActionMessage("イベントを中止しました");
      await refresh();
    }
  };

  return (
    <div>
      <Card className="mb-6">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <p className="mt-2 text-gray-600">{event.description}</p>
        <div className="mt-4 space-y-1 text-sm text-gray-700">
          <p>開始: {formatDate(event.startsAt)}</p>
          <p>終了: {formatDate(event.endsAt)}</p>
          <p>形式: {event.format}</p>
          <p>定員: {event.capacity}名</p>
          {capacity && (
            <p>
              残席: {capacity.remaining}名 / 承認済み: {capacity.approved}名
            </p>
          )}
          <p>ステータス: {event.status}</p>
        </div>

        {actionMessage && (
          <p className="mt-3 text-sm text-green-600">{actionMessage}</p>
        )}
        <ErrorAlert message={applyError} />

        <div className="mt-4 flex flex-wrap gap-2">
          {isAuthenticated && !myParticipation && !isOrganizer && (
            <Button onClick={handleApply} loading={applying}>
              参加申し込み
            </Button>
          )}

          {myParticipation && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">
                ステータス: {statusLabels[myParticipation.status]}
              </span>
              {(myParticipation.status === "APPLIED" ||
                myParticipation.status === "APPROVED" ||
                myParticipation.status === "WAITLISTED") && (
                <Button
                  variant="danger"
                  onClick={handleCancelParticipation}
                  loading={cancellingParticipation}
                >
                  キャンセル
                </Button>
              )}
            </div>
          )}

          {isOrganizer && (
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/events/${event.id}/applications`}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                申し込み一覧
              </Link>
              {event.status === "DRAFT" && (
                <Button onClick={handlePublish} loading={publishing}>
                  公開
                </Button>
              )}
              {event.status === "PUBLISHED" && (
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  loading={closing}
                >
                  クローズ
                </Button>
              )}
              {(event.status === "DRAFT" || event.status === "PUBLISHED") && (
                <Button
                  variant="danger"
                  onClick={handleCancelEvent}
                  loading={cancelling}
                >
                  中止
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {isAuthenticated && myParticipation?.status === "APPROVED" && (
        <Link
          to={`/events/${event.id}/checkin`}
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          チェックインページへ
        </Link>
      )}
    </div>
  );
};
