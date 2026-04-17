import type { CreateCommunityError, GetCommunityError } from '../errors/community-errors';
import type { ErrorResponse } from '@shared/controllers/error-response';

// ============================================================
// コミュニティエラー → HTTP レスポンス マッピング
// ============================================================

/**
 * コミュニティ作成エラーをHTTPレスポンスにマッピングする
 */
export function mapCreateCommunityErrorToResponse(error: CreateCommunityError): ErrorResponse {
  switch (error.type) {
    case 'DuplicateCommunityName':
      return {
        status: 409,
        response: {
          code: 'DUPLICATE_COMMUNITY_NAME',
          message: `このコミュニティ名は既に使用されています: ${error.name}`,
        },
      };
    case 'TooManyCommunities':
      return {
        status: 422,
        response: {
          code: 'TOO_MANY_COMMUNITIES',
          message: 'コミュニティの作成数が上限に達しています',
        },
      };
  }
}

/**
 * コミュニティ取得エラーをHTTPレスポンスにマッピングする
 */
export function mapGetCommunityErrorToResponse(error: GetCommunityError): ErrorResponse {
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
