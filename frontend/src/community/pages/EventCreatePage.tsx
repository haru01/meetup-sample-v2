import { useNavigate, useParams } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { Card } from "../../components/Card";
import { EventCreateForm } from "../components/EventCreateForm";
import type { CreateEventRequest } from "../types";

export const EventCreatePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createEvent, loading, error } = useEvents();

  const handleSubmit = async (data: CreateEventRequest) => {
    if (!id) return;
    const event = await createEvent(id, data);
    if (event) {
      navigate(`/communities/${id}`);
    }
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-lg">
        <h1 className="mb-6 text-2xl font-bold">イベント作成</h1>
        <EventCreateForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      </Card>
    </div>
  );
};
