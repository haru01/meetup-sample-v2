import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CategoryBadge } from "../CategoryBadge";
import type { Category } from "../../types";

describe("CategoryBadge コンポーネント", () => {
  it.each<[Category, string]>([
    ["TECH", "テクノロジー"],
    ["BUSINESS", "ビジネス"],
    ["HOBBY", "趣味"],
  ])("カテゴリ %s のラベル「%s」を表示する", (category, expectedLabel) => {
    render(<CategoryBadge category={category} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });
});
