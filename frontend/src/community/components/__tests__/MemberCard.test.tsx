import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { MemberCard } from "../MemberCard";
import type { CommunityMember } from "../../types";

const baseMember: CommunityMember = {
  id: "m1",
  communityId: "c1",
  accountId: "user-123",
  accountName: "テストユーザー",
  role: "MEMBER",
  status: "ACTIVE",
  createdAt: "2024-01-01",
};

const ownerMember: CommunityMember = {
  ...baseMember,
  id: "m2",
  accountId: "owner-456",
  accountName: "オーナーユーザー",
  role: "OWNER",
};

describe("MemberCard コンポーネント", () => {
  it("メンバーのアカウント名とロール・ステータスを表示する", () => {
    render(
      <MemberCard
        member={baseMember}
        isOwner={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("テストユーザー")).toBeInTheDocument();
    expect(screen.getByText("MEMBER / ACTIVE")).toBeInTheDocument();
  });

  it("accountName が null の場合、accountId をフォールバック表示する", () => {
    const memberWithoutName: CommunityMember = {
      ...baseMember,
      accountName: null,
    };
    render(
      <MemberCard
        member={memberWithoutName}
        isOwner={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("user-123")).toBeInTheDocument();
  });

  it("isOwner が false の場合、承認・拒否ボタンを表示しない", () => {
    render(
      <MemberCard
        member={baseMember}
        isOwner={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.queryByText("承認")).not.toBeInTheDocument();
    expect(screen.queryByText("拒否")).not.toBeInTheDocument();
  });

  it("isOwner が true の場合、MEMBER に対して承認・拒否ボタンを表示する", () => {
    render(
      <MemberCard
        member={baseMember}
        isOwner={true}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("承認")).toBeInTheDocument();
    expect(screen.getByText("拒否")).toBeInTheDocument();
  });

  it("isOwner が true でも OWNER メンバーには承認・拒否ボタンを表示しない", () => {
    render(
      <MemberCard
        member={ownerMember}
        isOwner={true}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.queryByText("承認")).not.toBeInTheDocument();
    expect(screen.queryByText("拒否")).not.toBeInTheDocument();
  });

  it("承認ボタンをクリックすると onApprove がメンバーIDで呼ばれる", async () => {
    const onApprove = vi.fn();
    render(
      <MemberCard
        member={baseMember}
        isOwner={true}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("承認"));
    expect(onApprove).toHaveBeenCalledWith("m1");
  });

  it("拒否ボタンをクリックすると onReject がメンバーIDで呼ばれる", async () => {
    const onReject = vi.fn();
    render(
      <MemberCard
        member={baseMember}
        isOwner={true}
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    );
    await userEvent.click(screen.getByText("拒否"));
    expect(onReject).toHaveBeenCalledWith("m1");
  });
});
