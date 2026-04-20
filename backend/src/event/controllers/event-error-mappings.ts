import type { ErrorResponse } from '@shared/controllers/error-response';
import type { CreateEventError, PublishEventError } from '../errors/event-errors';

// ============================================================
// HTTP レスポンスマッピング
// ============================================================

export function mapCreateEventErrorToResponse(error: CreateEventError): ErrorResponse {
  switch (error.type) {
    case 'CommunityNotFound':
      return {
        status: 404,
        response: { code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' },
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

export function mapPublishEventErrorToResponse(error: PublishEventError): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return {
        status: 404,
        response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
      };
    case 'EventAlreadyPublished':
      return {
        status: 422,
        response: {
          code: 'EVENT_ALREADY_PUBLISHED',
          message: 'イベントは既に公開されているか、公開できない状態です',
        },
      };
  }
}
