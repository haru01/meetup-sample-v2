import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import type { CommunityMember } from "../types";

type MemberCardProps = {
  member: CommunityMember;
  isOwner: boolean;
  onApprove: (memberId: string) => void;
  onReject: (memberId: string) => void;
};

export const MemberCard = ({
  member,
  isOwner,
  onApprove,
  onReject,
}: MemberCardProps) => (
  <Card className="flex items-center justify-between">
    <div>
      <p className="font-medium">{member.accountName ?? member.accountId}</p>
      <p className="text-sm text-gray-500">
        {member.role} / {member.status}
      </p>
    </div>
    {isOwner && member.role !== "OWNER" && (
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onApprove(member.id)}>
          承認
        </Button>
        <Button variant="danger" onClick={() => onReject(member.id)}>
          拒否
        </Button>
      </div>
    )}
  </Card>
);
