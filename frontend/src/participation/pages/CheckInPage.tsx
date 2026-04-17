import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useMyParticipations } from "../hooks/useMyParticipations";
import { useEventDetail } from "../../event/hooks/useEventDetail";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { ErrorAlert } from "../../components/ErrorAlert";
import type { CheckInResponse } from "../types";

export const CheckInPage = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, authLoading } = useAuth();
  const { event, fetchEvent } = useEventDetail();
  const { participations, fetchMyParticipations } = useMyParticipations();
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchEvent(id);
  }, [id, fetchEvent]);

  useEffect(() => {
    if (isAuthenticated) fetchMyParticipations();
  }, [isAuthenticated, fetchMyParticipations]);

  if (authLoading) return <p>読み込み中...</p>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const myParticipation = participations.find(
    (p) => p.eventId === id && p.status === "APPROVED",
  );

  const handleCheckIn = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const result = await apiClient.post<CheckInResponse>(
      `/events/${id}/checkins`,
      {},
    );
    if (result.ok) {
      setCheckedInAt(result.data.checkin.checkedInAt);
    } else {
      setError("チェックインに失敗しました");
    }
    setLoading(false);
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-md">
        <h1 className="mb-4 text-2xl font-bold">チェックイン</h1>
        {event && <p className="mb-4 text-gray-600">{event.title}</p>}

        <ErrorAlert message={error} />

        {checkedInAt ? (
          <p className="text-green-600">
            チェックイン済み（{new Date(checkedInAt).toLocaleString()}）
          </p>
        ) : !myParticipation ? (
          <p className="text-gray-500">
            承認済みの参加者のみチェックインできます
          </p>
        ) : (
          <Button onClick={handleCheckIn} loading={loading} className="w-full">
            チェックインする
          </Button>
        )}
      </Card>
    </div>
  );
};
