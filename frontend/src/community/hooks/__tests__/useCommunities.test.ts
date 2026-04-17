import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCommunities } from "../useCommunities";

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from "../../../lib/api-client";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

describe("useCommunities フック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchCommunities でコミュニティ一覧を取得する", async () => {
    const communities = [
      {
        id: "1",
        name: "Test Community",
        description: "desc",
        category: "TECH",
        visibility: "PUBLIC",
        createdAt: "",
        updatedAt: "",
      },
    ];
    mockGet.mockResolvedValue({ ok: true, data: { communities } });

    const { result } = renderHook(() => useCommunities());

    await act(async () => {
      await result.current.fetchCommunities();
    });

    expect(result.current.communities).toEqual(communities);
    expect(result.current.error).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("/communities");
  });

  it("fetchCommunities 失敗時にエラーを設定する", async () => {
    mockGet.mockResolvedValue({ ok: false, error: { message: "error" } });

    const { result } = renderHook(() => useCommunities());

    await act(async () => {
      await result.current.fetchCommunities();
    });

    expect(result.current.error).toBe("コミュニティの取得に失敗しました");
  });

  it("getCommunity で単一コミュニティを取得する", async () => {
    const community = {
      id: "1",
      name: "Test",
      description: "desc",
      category: "TECH",
      visibility: "PUBLIC",
      createdAt: "",
      updatedAt: "",
    };
    mockGet.mockResolvedValue({ ok: true, data: { community } });

    const { result } = renderHook(() => useCommunities());

    await act(async () => {
      await result.current.getCommunity("1");
    });

    expect(result.current.community).toEqual(community);
    expect(mockGet).toHaveBeenCalledWith("/communities/1");
  });

  it("createCommunity でコミュニティを作成する", async () => {
    const community = {
      id: "1",
      name: "New",
      description: "desc",
      category: "TECH",
      visibility: "PUBLIC",
      createdAt: "",
      updatedAt: "",
    };
    mockPost.mockResolvedValue({ ok: true, data: { community } });

    const { result } = renderHook(() => useCommunities());

    let created: unknown;
    await act(async () => {
      created = await result.current.createCommunity({
        name: "New",
        description: "desc",
        category: "TECH",
        visibility: "PUBLIC",
      });
    });

    expect(created).toEqual(community);
    expect(mockPost).toHaveBeenCalledWith("/communities", {
      name: "New",
      description: "desc",
      category: "TECH",
      visibility: "PUBLIC",
    });
  });

  it("createCommunity 失敗時に null を返す", async () => {
    mockPost.mockResolvedValue({ ok: false, error: { message: "error" } });

    const { result } = renderHook(() => useCommunities());

    let created: unknown;
    await act(async () => {
      created = await result.current.createCommunity({
        name: "New",
        description: "desc",
        category: "TECH",
        visibility: "PUBLIC",
      });
    });

    expect(created).toBeNull();
    expect(result.current.error).toBe("コミュニティの作成に失敗しました");
  });

  it("getMyCommunities でマイコミュニティを取得する", async () => {
    const communities = [
      {
        id: "1",
        name: "My Community",
        description: "desc",
        category: "BUSINESS",
        visibility: "PRIVATE",
        createdAt: "",
        updatedAt: "",
      },
    ];
    mockGet.mockResolvedValue({ ok: true, data: { communities } });

    const { result } = renderHook(() => useCommunities());

    await act(async () => {
      await result.current.getMyCommunities();
    });

    expect(result.current.communities).toEqual(communities);
    expect(mockGet).toHaveBeenCalledWith("/communities?member=me");
  });
});
