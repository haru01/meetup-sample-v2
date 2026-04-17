import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ErrorAlert } from "../ErrorAlert";

describe("ErrorAlert コンポーネント", () => {
  it("メッセージがある場合にアラートを表示する", () => {
    render(<ErrorAlert message="エラーが発生しました" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("エラーが発生しました");
  });

  it("メッセージが null の場合は何も表示しない", () => {
    const { container } = render(<ErrorAlert message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("メッセージが undefined の場合は何も表示しない", () => {
    const { container } = render(<ErrorAlert message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("メッセージが空文字の場合は何も表示しない", () => {
    const { container } = render(<ErrorAlert message="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
