import type { ErrorResponse } from '@shared/controllers/error-response';
import type {
  ApplyForEventError,
  ApproveParticipationsError,
  CancelParticipationError,
  GetApplicationListError,
  GetRemainingCapacityError,
} from '../errors/participation-errors';

// ============================================================
// 参加エラー → HTTP レスポンス マッピング
// ============================================================

export function mapApplyForEventErrorToResponse(error: ApplyForEventError): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return { status: 404, response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' } };
    case 'EventNotPublished':
      return {
        status: 422,
        response: { code: 'EVENT_NOT_PUBLISHED', message: 'イベントが公開されていません' },
      };
    case 'AlreadyApplied':
      return {
        status: 409,
        response: { code: 'ALREADY_APPLIED', message: 'すでに申込済みです' },
      };
  }
}

export function mapApproveParticipationsErrorToResponse(
  error: ApproveParticipationsError
): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return { status: 404, response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' } };
    case 'Unauthorized':
      return { status: 403, response: { code: 'FORBIDDEN', message: '権限がありません' } };
    case 'ParticipationNotFound':
      return {
        status: 404,
        response: { code: 'PARTICIPATION_NOT_FOUND', message: '参加申込が見つかりません' },
      };
    case 'ParticipationInvalidStatus':
      return {
        status: 422,
        response: {
          code: 'PARTICIPATION_INVALID_STATUS',
          message: `現在のステータス(${error.current})では承認できません`,
        },
      };
  }
}

export function mapCancelParticipationErrorToResponse(
  error: CancelParticipationError
): ErrorResponse {
  switch (error.type) {
    case 'ParticipationNotFound':
      return {
        status: 404,
        response: { code: 'PARTICIPATION_NOT_FOUND', message: '参加申込が見つかりません' },
      };
    case 'Unauthorized':
      return { status: 403, response: { code: 'FORBIDDEN', message: '権限がありません' } };
    case 'ParticipationInvalidStatus':
      return {
        status: 422,
        response: {
          code: 'PARTICIPATION_INVALID_STATUS',
          message: `現在のステータス(${error.current})ではキャンセルできません`,
        },
      };
  }
}

export function mapGetApplicationListErrorToResponse(
  error: GetApplicationListError
): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return { status: 404, response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' } };
    case 'Unauthorized':
      return { status: 403, response: { code: 'FORBIDDEN', message: '権限がありません' } };
  }
}

export function mapGetRemainingCapacityErrorToResponse(
  error: GetRemainingCapacityError
): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return { status: 404, response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' } };
  }
}
