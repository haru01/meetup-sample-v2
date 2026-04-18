import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RegisterPage } from "../RegisterPage";
import { AuthContext, type AuthContextType } from "../../contexts/AuthContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const createAuthContext = (
  overrides: Partial<AuthContextType> = {},
): AuthContextType => ({
  user: null,
  isAuthenticated: false,
  authLoading: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  ...overrides,
});

const renderWithProviders = (authCtx: AuthContextType) => {
  return render(
    <AuthContext.Provider value={authCtx}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("登録フォームをレンダリングする", () => {
    renderWithProviders(createAuthContext());
    expect(
      screen.getByRole("heading", { name: "新規登録" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("名前")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登録" })).toBeInTheDocument();
  });

  it("未入力でフォーム送信するとエラーを表示する", async () => {
    renderWithProviders(createAuthContext());
    await userEvent.click(screen.getByRole("button", { name: "登録" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "すべてのフィールドを入力してください",
    );
  });

  it("正しい入力で register を呼び出す", async () => {
    const register = vi.fn();
    renderWithProviders(createAuthContext({ register }));

    await userEvent.type(screen.getByLabelText("名前"), "テスト太郎");
    await userEvent.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "登録" }));

    expect(register).toHaveBeenCalledWith(
      "テスト太郎",
      "test@example.com",
      "password123",
    );
  });

  it("register 失敗時にエラーを表示する", async () => {
    const register = vi.fn().mockRejectedValue(new Error("fail"));
    renderWithProviders(createAuthContext({ register }));

    await userEvent.type(screen.getByLabelText("名前"), "テスト");
    await userEvent.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "pass");
    await userEvent.click(screen.getByRole("button", { name: "登録" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "登録に失敗しました",
    );
  });

  it("ログインリンクが存在する", () => {
    renderWithProviders(createAuthContext());
    expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute(
      "href",
      "/login",
    );
  });
});
