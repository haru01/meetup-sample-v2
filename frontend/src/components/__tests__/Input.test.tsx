import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Input } from "../Input";

describe("Input コンポーネント", () => {
  it("ラベルと入力フィールドをレンダリングする", () => {
    render(<Input label="メールアドレス" />);
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
  });

  it("エラーメッセージを表示する", () => {
    render(<Input label="メール" error="メールアドレスは必須です" />);
    expect(screen.getByText("メールアドレスは必須です")).toBeInTheDocument();
  });

  it("エラーがない場合はエラーメッセージを表示しない", () => {
    render(<Input label="メール" />);
    expect(screen.queryByText(/必須/)).not.toBeInTheDocument();
  });

  it("入力値を変更できる", async () => {
    render(<Input label="名前" />);
    const input = screen.getByLabelText("名前");
    await userEvent.type(input, "テスト太郎");
    expect(input).toHaveValue("テスト太郎");
  });

  it("エラー時にボーダーが赤くなる", () => {
    render(<Input label="メール" error="エラー" />);
    expect(screen.getByLabelText("メール")).toHaveClass("border-red-500");
  });
});
