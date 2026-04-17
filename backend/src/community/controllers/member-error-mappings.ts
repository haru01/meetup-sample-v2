import type {
  JoinCommunityError,
  LeaveCommunityError,
  ApproveMemberError,
  RejectMemberError,
  ListMembersError,
} from '../errors/community-errors';
import type { ErrorResponse } from '@shared/controllers/error-response';

// ============================================================
// メンバーエラー → HTTP レスポンス マッピング
// ============================================================

/**
 * コミュニティ参加エラーをHTTPレスポンスにマッピングする
 */
export function mapJoinCommunityErrorToResponse(error: JoinCommunityError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'コミュニティが見つかりません',
        },
      };
    case 'AlreadyMember':
      return {
        status: 409,
        response: {
          code: 'ALREADY_MEMBER',
          message: '既にこのコミュニティのメンバーです',
        },
      };
  }
}

/**
 * コミュニティ脱退エラーをHTTPレスポンスにマッピングする
 */
export function mapLeaveCommunityErrorToResponse(error: LeaveCommunityError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'コミュニティが見つかりません',
        },
      };
    case 'MemberNotFound':
      return {
        status: 404,
        response: {
          code: 'MEMBER_NOT_FOUND',
          message: 'メンバーが見つかりません',
        },
      };
    case 'OwnerCannotLeave':
      return {
        status: 422,
        response: {
          code: 'OWNER_CANNOT_LEAVE',
          message: 'オーナーはコミュニティを脱退できません',
        },
      };
  }
}

/**
 * メンバー承認エラーをHTTPレスポンスにマッピングする
 */
export function mapApproveMemberErrorToResponse(error: ApproveMemberError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'コミュニティが見つかりません',
        },
      };
    case 'MemberNotFound':
      return {
        status: 404,
        response: {
          code: 'MEMBER_NOT_FOUND',
          message: 'メンバーが見つかりません',
        },
      };
    case 'MemberAlreadyActive':
      return {
        status: 422,
        response: {
          code: 'MEMBER_ALREADY_ACTIVE',
          message: 'メンバーは既にアクティブです',
        },
      };
  }
}

/**
 * メンバー拒否エラーをHTTPレスポンスにマッピングする
 */
export function mapRejectMemberErrorToResponse(error: RejectMemberError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'コミュニティが見つかりません',
        },
      };
    case 'MemberNotFound':
      return {
        status: 404,
        response: {
          code: 'MEMBER_NOT_FOUND',
          message: 'メンバーが見つかりません',
        },
      };
  }
}

/**
 * メンバー一覧取得エラーをHTTPレスポンスにマッピングする
 */
export function mapListMembersErrorToResponse(error: ListMembersError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'コミュニティが見つかりません',
        },
      };
  }
}
