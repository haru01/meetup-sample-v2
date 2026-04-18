import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../LoginPage";
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
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ログインフォームをレンダリングする", () => {
    renderWithProviders(createAuthContext());
    expect(
      screen.getByRole("heading", { name: "ログイン" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ログイン" }),
    ).toBeInTheDocument();
  });

  it("未入力でフォーム送信するとエラーを表示する", async () => {
    renderWithProviders(createAuthContext());
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "メールアドレスとパスワードを入力してください",
    );
  });

  it("正しい入力で login を呼び出す", async () => {
    const login = vi.fn();
    renderWithProviders(createAuthContext({ login }));

    await userEvent.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(login).toHaveBeenCalledWith("test@example.com", "password123");
  });

  it("login 失敗時にエラーを表示する", async () => {
    const login = vi.fn().mockRejectedValue(new Error("fail"));
    renderWithProviders(createAuthContext({ login }));

    await userEvent.type(
      screen.getByLabelText("メールアドレス"),
      "test@example.com",
    );
    await userEvent.type(screen.getByLabelText("パスワード"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "ログインに失敗しました",
    );
  });

  it("新規登録リンクが存在する", () => {
    renderWithProviders(createAuthContext());
    expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute(
      "href",
      "/register",
    );
  });
});
