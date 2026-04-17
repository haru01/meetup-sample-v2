import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEvents } from "../useEvents";

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from "../../../lib/api-client";

const mockPost = vi.mocked(apiClient.post);

describe("useEvents フック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createEvent でイベントを作成する", async () => {
    const event = {
      id: "1",
      communityId: "c1",
      title: "テストイベント",
      description: "説明",
      startsAt: "2026-07-01T19:00:00.000Z",
      endsAt: "2026-07-01T21:00:00.000Z",
      format: "ONLINE",
      capacity: 50,
      status: "DRAFT",
      createdAt: "",
      updatedAt: "",
    };
    mockPost.mockResolvedValue({ ok: true, data: { event } });

    const { result } = renderHook(() => useEvents());

    let created: unknown;
    await act(async () => {
      created = await result.current.createEvent("c1", {
        title: "テストイベント",
        description: "説明",
        startsAt: "2026-07-01T19:00:00.000Z",
        endsAt: "2026-07-01T21:00:00.000Z",
        format: "ONLINE",
        capacity: 50,
      });
    });

    expect(created).toEqual(event);
    expect(mockPost).toHaveBeenCalledWith("/communities/c1/events", {
      title: "テストイベント",
      description: "説明",
      startsAt: "2026-07-01T19:00:00.000Z",
      endsAt: "2026-07-01T21:00:00.000Z",
      format: "ONLINE",
      capacity: 50,
    });
  });

  it("createEvent 失敗時に null を返しエラーを設定する", async () => {
    mockPost.mockResolvedValue({ ok: false, error: { message: "error" } });

    const { result } = renderHook(() => useEvents());

    let created: unknown;
    await act(async () => {
      created = await result.current.createEvent("c1", {
        title: "テスト",
        description: "説明",
        startsAt: "2026-07-01T19:00:00.000Z",
        endsAt: "2026-07-01T21:00:00.000Z",
        format: "ONLINE",
        capacity: 50,
      });
    });

    expect(created).toBeNull();
    expect(result.current.error).toBe("イベントの作成に失敗しました");
  });
});
