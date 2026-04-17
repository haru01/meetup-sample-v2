import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { VisibilityBadge } from "../VisibilityBadge";
import type { Visibility } from "../../types";

describe("VisibilityBadge コンポーネント", () => {
  it.each<[Visibility, string]>([
    ["PUBLIC", "公開"],
    ["PRIVATE", "非公開"],
  ])("公開設定 %s のラベル「%s」を表示する", (visibility, expectedLabel) => {
    render(<VisibilityBadge visibility={visibility} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });
});
