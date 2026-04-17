import { useEffect } from "react";
import { Link } from "react-router-dom";
import { usePublishedEvents } from "../hooks/usePublishedEvents";
import { Card } from "../../components/Card";
import { ErrorAlert } from "../../components/ErrorAlert";

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(
    d.getHours(),
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const formatLabels: Record<string, string> = {
  ONLINE: "オンライン",
  OFFLINE: "オフライン",
  HYBRID: "ハイブリッド",
};

export const EventListPage = () => {
  const { events, loading, error, fetchEvents } = usePublishedEvents();

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">イベント一覧</h1>

      <ErrorAlert message={error} />

      {loading && <p>読み込み中...</p>}

      {!loading && events.length === 0 && !error && (
        <p className="text-gray-500">公開中のイベントはありません</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="block transition hover:shadow-md"
          >
            <Card>
              <h2 className="text-lg font-semibold">{event.title}</h2>
              <p className="mt-2 text-sm text-gray-600">
                開始: {formatDate(event.startsAt)}
              </p>
              <p className="text-sm text-gray-600">
                終了: {formatDate(event.endsAt)}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                形式: {formatLabels[event.format] ?? event.format}
              </p>
              <p className="text-sm text-gray-600">定員: {event.capacity}名</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
