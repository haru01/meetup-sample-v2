// --- Shared types ---

export type ApiError = {
  readonly type: string;
  readonly message: string;
};

// Re-export context-specific types for backward compatibility
export type {
  Account,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
} from "../auth/types";
export type {
  Category,
  Visibility,
  Role,
  MemberStatus,
  Community,
  CommunityMember,
  CreateCommunityRequest,
  UpdateCommunityRequest,
  ListCommunitiesResponse,
  CommunityResponse,
  JoinCommunityRequest,
  UpdateMemberRoleRequest,
  BanMemberRequest,
  ListMembersResponse,
  MemberResponse,
} from "../community/types";
