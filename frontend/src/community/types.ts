// --- Union types ---

export type Category = "TECH" | "BUSINESS" | "HOBBY";

export type Visibility = "PUBLIC" | "PRIVATE";

export type Role = "OWNER" | "ADMIN" | "MEMBER";

export type MemberStatus = "PENDING" | "ACTIVE";

// --- Domain entities ---

export type Community = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: Category;
  readonly visibility: Visibility;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CommunityMember = {
  readonly id: string;
  readonly communityId: string;
  /**
   * ACTIVE メンバー自身が閲覧している場合のみ返却される（列挙防止）。
   * 未ログイン・非メンバーの requester には含まれない。
   */
  readonly accountId?: string;
  readonly accountName: string | null;
  readonly role: Role;
  readonly status: MemberStatus;
  readonly createdAt: string;
};

// --- Community request/response types ---

export type CreateCommunityRequest = {
  name: string;
  description: string;
  category: Category;
  visibility: Visibility;
};

export type UpdateCommunityRequest = {
  name?: string;
  description?: string;
  category?: Category;
  visibility?: Visibility;
};

export type ListCommunitiesResponse = {
  communities: Community[];
};

export type CommunityResponse = {
  community: Community;
};

// --- Member request/response types ---

export type JoinCommunityRequest = {
  accountId: string;
};

export type UpdateMemberRoleRequest = {
  role: Role;
};

export type BanMemberRequest = {
  reason?: string;
};

export type ListMembersResponse = {
  members: CommunityMember[];
};

export type MemberResponse = {
  member: CommunityMember;
};

// --- Event types ---

export type EventFormat = "ONLINE" | "OFFLINE" | "HYBRID";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "CANCELLED";

export type Event = {
  readonly id: string;
  readonly communityId: string;
  readonly title: string;
  readonly description: string | null;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly format: EventFormat;
  readonly capacity: number;
  readonly status: EventStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateEventRequest = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  format: EventFormat;
  capacity: number;
};

export type EventResponse = {
  event: Event;
};
