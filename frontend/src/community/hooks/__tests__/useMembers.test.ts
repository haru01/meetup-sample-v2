import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useMembers } from "../useMembers";

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "../../../lib/api-client";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
const mockDelete = vi.mocked(apiClient.delete);

describe("useMembers フック", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listMembers でメンバー一覧を取得する", async () => {
    const members = [
      {
        id: "m1",
        communityId: "c1",
        accountId: "a1",
        accountName: "テストユーザー",
        role: "OWNER",
        status: "ACTIVE",
        createdAt: "",
      },
    ];
    mockGet.mockResolvedValue({ ok: true, data: { members } });

    const { result } = renderHook(() => useMembers());

    await act(async () => {
      await result.current.listMembers("c1");
    });

    expect(result.current.members).toEqual(members);
    expect(mockGet).toHaveBeenCalledWith("/communities/c1/members");
  });

  it("listMembers 失敗時にエラーを設定する", async () => {
    mockGet.mockResolvedValue({ ok: false, error: { message: "error" } });

    const { result } = renderHook(() => useMembers());

    await act(async () => {
      await result.current.listMembers("c1");
    });

    expect(result.current.error).toBe("メンバー一覧の取得に失敗しました");
  });

  it("joinCommunity でコミュニティに参加する", async () => {
    const member = {
      id: "m1",
      communityId: "c1",
      accountId: "a1",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: "",
    };
    mockPost.mockResolvedValue({ ok: true, data: { member } });

    const { result } = renderHook(() => useMembers());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.joinCommunity("c1", "a1");
    });

    expect(success).toBe(true);
    expect(mockPost).toHaveBeenCalledWith("/communities/c1/members", {
      accountId: "a1",
    });
  });

  it("joinCommunity 失敗時に false を返す", async () => {
    mockPost.mockResolvedValue({ ok: false, error: { message: "error" } });

    const { result } = renderHook(() => useMembers());

    let success: boolean = true;
    await act(async () => {
      success = await result.current.joinCommunity("c1", "a1");
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("コミュニティへの参加に失敗しました");
  });

  it("leaveCommunity でコミュニティから退会する", async () => {
    mockDelete.mockResolvedValue({ ok: true, data: undefined as never });

    const { result } = renderHook(() => useMembers());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.leaveCommunity("c1", "m1");
    });

    expect(success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("/communities/c1/members/m1");
  });

  it("approveMember でメンバーを承認する", async () => {
    const member = {
      id: "m1",
      communityId: "c1",
      accountId: "a1",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: "",
    };
    mockPatch.mockResolvedValue({ ok: true, data: { member } });

    const { result } = renderHook(() => useMembers());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.approveMember("c1", "m1");
    });

    expect(success).toBe(true);
    expect(mockPatch).toHaveBeenCalledWith(
      "/communities/c1/members/m1/approve",
      {},
    );
  });

  it("rejectMember でメンバーを拒否する", async () => {
    const member = {
      id: "m1",
      communityId: "c1",
      accountId: "a1",
      role: "MEMBER",
      status: "ACTIVE",
      createdAt: "",
    };
    mockPatch.mockResolvedValue({ ok: true, data: { member } });

    const { result } = renderHook(() => useMembers());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.rejectMember("c1", "m1");
    });

    expect(success).toBe(true);
    expect(mockPatch).toHaveBeenCalledWith(
      "/communities/c1/members/m1/reject",
      {},
    );
  });
});
