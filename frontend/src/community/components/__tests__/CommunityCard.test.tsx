import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { CommunityCard } from "../CommunityCard";
import type { Community } from "../../types";

const community: Community = {
  id: "c1",
  name: "React勉強会",
  description: "Reactを学ぶコミュニティ",
  category: "TECH",
  visibility: "PUBLIC",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("CommunityCard コンポーネント", () => {
  it("コミュニティ名と説明を表示する", () => {
    renderWithRouter(<CommunityCard community={community} />);
    expect(screen.getByText("React勉強会")).toBeInTheDocument();
    expect(screen.getByText("Reactを学ぶコミュニティ")).toBeInTheDocument();
  });

  it("コミュニティ詳細ページへのリンクを持つ", () => {
    renderWithRouter(<CommunityCard community={community} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/communities/c1");
  });

  it("showBadges が false の場合バッジを表示しない", () => {
    renderWithRouter(<CommunityCard community={community} />);
    expect(screen.queryByText("テクノロジー")).not.toBeInTheDocument();
    expect(screen.queryByText("公開")).not.toBeInTheDocument();
  });

  it("showBadges が true の場合カテゴリと公開設定のバッジを表示する", () => {
    renderWithRouter(<CommunityCard community={community} showBadges />);
    expect(screen.getByText("テクノロジー")).toBeInTheDocument();
    expect(screen.getByText("公開")).toBeInTheDocument();
  });
});
