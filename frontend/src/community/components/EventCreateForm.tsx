import { useState, type FormEvent } from "react";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { ErrorAlert } from "../../components/ErrorAlert";
import { EVENT_FORMATS, getFormatLabel } from "../utils/event-label-utils";
import type { CreateEventRequest, EventFormat } from "../types";

type EventCreateFormProps = {
  onSubmit: (data: CreateEventRequest) => void;
  loading: boolean;
  error: string | null;
};

export const EventCreateForm = ({
  onSubmit,
  loading,
  error,
}: EventCreateFormProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [format, setFormat] = useState<EventFormat>("ONLINE");
  const [capacity, setCapacity] = useState(50);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!title || !startsAt || !endsAt) {
      setValidationError("タイトルと日時を入力してください");
      return;
    }

    onSubmit({
      title,
      description,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      format,
      capacity,
    });
  };

  return (
    <>
      <ErrorAlert message={validationError || error} />
      <form onSubmit={handleSubmit}>
        <Input
          label="タイトル"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mb-4">
          <label
            htmlFor="event-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            説明
          </label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>
        <Input
          label="開始日時"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
        />
        <Input
          label="終了日時"
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
        />
        <div className="mb-4">
          <label
            htmlFor="event-format"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            開催形式
          </label>
          <select
            id="event-format"
            value={format}
            onChange={(e) => setFormat(e.target.value as EventFormat)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            {EVENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {getFormatLabel(f)}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="定員"
          type="number"
          value={String(capacity)}
          onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 0)}
          min={1}
          max={1000}
        />
        <Button type="submit" loading={loading} className="w-full">
          作成
        </Button>
      </form>
    </>
  );
};
