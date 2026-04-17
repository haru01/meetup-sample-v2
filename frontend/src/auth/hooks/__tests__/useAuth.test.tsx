import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { AuthProvider } from "../../contexts/AuthContext";
import { useAuth } from "../useAuth";

vi.mock("../../../lib/token", () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  removeToken: vi.fn(),
}));

vi.mock("../../../lib/api-client", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { getToken, setToken, removeToken } from "../../../lib/token";
import { apiClient } from "../../../lib/api-client";

const mockGetToken = vi.mocked(getToken);
const mockSetToken = vi.mocked(setToken);
const mockRemoveToken = vi.mocked(removeToken);
const mockApiClientPost = vi.mocked(apiClient.post);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const mockAccount = {
  id: "account-1",
  name: "テストユーザー",
  email: "test@example.com",
  createdAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockReturnValue(null);
});

describe("useAuth", () => {
  describe("初期状態", () => {
    it("トークンがない場合、user は null で isAuthenticated は false", () => {
      mockGetToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("login", () => {
    it("ログイン成功時にトークンをセットしてユーザー状態を更新する", async () => {
      mockGetToken.mockReturnValue(null);
      mockApiClientPost.mockResolvedValueOnce({
        ok: true,
        data: { token: "jwt-token", account: mockAccount },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login("test@example.com", "password123");
      });

      expect(mockApiClientPost).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
      expect(mockSetToken).toHaveBeenCalledWith("jwt-token");
      expect(result.current.user).toEqual(mockAccount);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("ログイン失敗時はユーザー状態を更新しない", async () => {
      mockGetToken.mockReturnValue(null);
      mockApiClientPost.mockResolvedValueOnce({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "認証に失敗しました" },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login("test@example.com", "wrongpassword");
      });

      expect(mockSetToken).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("register", () => {
    it("登録成功時にトークンをセットしてユーザー状態を更新する", async () => {
      mockGetToken.mockReturnValue(null);
      mockApiClientPost.mockResolvedValueOnce({
        ok: true,
        data: { token: "jwt-token", account: mockAccount },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(
          "テストユーザー",
          "test@example.com",
          "password123",
        );
      });

      expect(mockApiClientPost).toHaveBeenCalledWith("/auth/register", {
        name: "テストユーザー",
        email: "test@example.com",
        password: "password123",
      });
      expect(mockSetToken).toHaveBeenCalledWith("jwt-token");
      expect(result.current.user).toEqual(mockAccount);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("登録失敗時はユーザー状態を更新しない", async () => {
      mockGetToken.mockReturnValue(null);
      mockApiClientPost.mockResolvedValueOnce({
        ok: false,
        error: {
          code: "CONFLICT",
          message: "メールアドレスが既に使用されています",
        },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(
          "テストユーザー",
          "test@example.com",
          "password123",
        );
      });

      expect(mockSetToken).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("logout", () => {
    it("ログアウト時にトークンを削除してユーザー状態をクリアする", async () => {
      mockGetToken.mockReturnValue(null);
      mockApiClientPost.mockResolvedValueOnce({
        ok: true,
        data: { token: "jwt-token", account: mockAccount },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login("test@example.com", "password123");
      });

      expect(result.current.user).toEqual(mockAccount);
      expect(result.current.isAuthenticated).toBe(true);

      act(() => {
        result.current.logout();
      });

      expect(mockRemoveToken).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("isAuthenticated", () => {
    it("user が存在する場合は true", async () => {
      mockGetToken.mockReturnValue(null);
      mockApiClientPost.mockResolvedValueOnce({
        ok: true,
        data: { token: "jwt-token", account: mockAccount },
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login("test@example.com", "password123");
      });

      expect(result.current.isAuthenticated).toBe(true);
    });

    it("user が null の場合は false", () => {
      mockGetToken.mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
