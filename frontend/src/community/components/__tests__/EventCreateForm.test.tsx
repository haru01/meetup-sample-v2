import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { EventCreateForm } from "../EventCreateForm";

describe("EventCreateForm コンポーネント", () => {
  it("フォーム要素をレンダリングする", () => {
    render(<EventCreateForm onSubmit={vi.fn()} loading={false} error={null} />);
    expect(screen.getByLabelText("タイトル")).toBeInTheDocument();
    expect(screen.getByLabelText("説明")).toBeInTheDocument();
    expect(screen.getByLabelText("開始日時")).toBeInTheDocument();
    expect(screen.getByLabelText("終了日時")).toBeInTheDocument();
    expect(screen.getByLabelText("開催形式")).toBeInTheDocument();
    expect(screen.getByLabelText("定員")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  it("タイトルが未入力で送信するとバリデーションエラーを表示する", async () => {
    const onSubmit = vi.fn();
    render(
      <EventCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "タイトルと日時を入力してください",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("正しい入力で送信すると onSubmit をフォームデータで呼び出す", async () => {
    const onSubmit = vi.fn();
    render(
      <EventCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.type(screen.getByLabelText("タイトル"), "もくもく会");
    await userEvent.type(screen.getByLabelText("説明"), "プログラミングする会");
    await userEvent.type(screen.getByLabelText("開始日時"), "2026-07-01T19:00");
    await userEvent.type(screen.getByLabelText("終了日時"), "2026-07-01T21:00");
    await userEvent.selectOptions(screen.getByLabelText("開催形式"), "OFFLINE");
    await userEvent.clear(screen.getByLabelText("定員"));
    await userEvent.type(screen.getByLabelText("定員"), "30");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "もくもく会",
      description: "プログラミングする会",
      startsAt: expect.stringContaining("2026-07-01"),
      endsAt: expect.stringContaining("2026-07-01"),
      format: "OFFLINE",
      capacity: 30,
    });
  });

  it("外部エラー(error prop)を表示する", () => {
    render(
      <EventCreateForm
        onSubmit={vi.fn()}
        loading={false}
        error="サーバーエラーが発生しました"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "サーバーエラーが発生しました",
    );
  });

  it("loading 中はボタンが無効化される", () => {
    render(<EventCreateForm onSubmit={vi.fn()} loading={true} error={null} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
