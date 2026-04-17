import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { CommunityCreateForm } from "../CommunityCreateForm";

describe("CommunityCreateForm コンポーネント", () => {
  it("フォーム要素をレンダリングする", () => {
    render(
      <CommunityCreateForm onSubmit={vi.fn()} loading={false} error={null} />,
    );
    expect(screen.getByLabelText("コミュニティ名")).toBeInTheDocument();
    expect(screen.getByLabelText("説明")).toBeInTheDocument();
    expect(screen.getByLabelText("カテゴリ")).toBeInTheDocument();
    expect(screen.getByLabelText("公開設定")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "作成" })).toBeInTheDocument();
  });

  it("名前が未入力で送信するとバリデーションエラーを表示する", async () => {
    const onSubmit = vi.fn();
    render(
      <CommunityCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.type(screen.getByLabelText("説明"), "説明テキスト");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "名前と説明を入力してください",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("説明が未入力で送信するとバリデーションエラーを表示する", async () => {
    const onSubmit = vi.fn();
    render(
      <CommunityCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.type(screen.getByLabelText("コミュニティ名"), "テスト名");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "名前と説明を入力してください",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("両方未入力で送信するとバリデーションエラーを表示する", async () => {
    const onSubmit = vi.fn();
    render(
      <CommunityCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "名前と説明を入力してください",
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("正しい入力で送信すると onSubmit をフォームデータで呼び出す", async () => {
    const onSubmit = vi.fn();
    render(
      <CommunityCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    await userEvent.type(
      screen.getByLabelText("コミュニティ名"),
      "新コミュニティ",
    );
    await userEvent.type(screen.getByLabelText("説明"), "コミュニティの説明");
    await userEvent.selectOptions(
      screen.getByLabelText("カテゴリ"),
      "BUSINESS",
    );
    await userEvent.selectOptions(screen.getByLabelText("公開設定"), "PRIVATE");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "新コミュニティ",
      description: "コミュニティの説明",
      category: "BUSINESS",
      visibility: "PRIVATE",
    });
  });

  it("バリデーションエラー後に正しく入力して再送信するとエラーが消える", async () => {
    const onSubmit = vi.fn();
    render(
      <CommunityCreateForm onSubmit={onSubmit} loading={false} error={null} />,
    );

    // まず未入力で送信
    await userEvent.click(screen.getByRole("button", { name: "作成" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // 入力して再送信
    await userEvent.type(screen.getByLabelText("コミュニティ名"), "テスト");
    await userEvent.type(screen.getByLabelText("説明"), "テスト説明");
    await userEvent.click(screen.getByRole("button", { name: "作成" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalled();
  });

  it("外部エラー(error prop)を表示する", () => {
    render(
      <CommunityCreateForm
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
    render(
      <CommunityCreateForm onSubmit={vi.fn()} loading={true} error={null} />,
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
