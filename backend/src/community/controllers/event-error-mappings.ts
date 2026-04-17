import type { CreateEventError } from '../errors/event-errors';
import type { ErrorResponse } from '@shared/controllers/error-response';

// ============================================================
// イベントエラー → HTTP レスポンス マッピング
// ============================================================

/**
 * イベント作成エラーをHTTPレスポンスにマッピングする
 */
export function mapCreateEventErrorToResponse(error: CreateEventError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: {
          code: 'COMMUNITY_NOT_FOUND',
          message: 'コミュニティが見つかりません',
        },
      };
    case 'EventDateInPast':
      return {
        status: 422,
        response: {
          code: 'EVENT_DATE_IN_PAST',
          message: '開始日時は現在時刻より未来でなければなりません',
        },
      };
    case 'EventEndBeforeStart':
      return {
        status: 422,
        response: {
          code: 'EVENT_END_BEFORE_START',
          message: '終了日時は開始日時より後でなければなりません',
        },
      };
  }
}
