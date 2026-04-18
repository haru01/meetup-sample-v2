import type { ErrorResponse } from '@shared/controllers/error-response';
import type { CheckInError, ListCheckInsError } from '../errors/checkin-errors';

// ============================================================
// CheckIn エラー → HTTP レスポンス マッピング
// ============================================================

function invalidIdFormatResponse(field: string): ErrorResponse {
  return {
    status: 400,
    response: { code: 'INVALID_ID_FORMAT', message: `${field} の形式が不正です` },
  };
}

export function mapCheckInErrorToResponse(error: CheckInError): ErrorResponse {
  switch (error.type) {
    case 'ParticipationNotFound':
      return {
        status: 404,
        response: {
          code: 'PARTICIPATION_NOT_FOUND',
          message: '参加申し込みが見つかりません',
        },
      };
    case 'ParticipationNotApproved':
      return {
        status: 422,
        response: {
          code: 'PARTICIPATION_NOT_APPROVED',
          message: '参加申し込みが承認されていません',
        },
      };
    case 'CheckInAlreadyExists':
      return {
        status: 409,
        response: {
          code: 'CHECKIN_ALREADY_EXISTS',
          message: '既にチェックイン済みです',
        },
      };
    case 'Unauthorized':
      return {
        status: 403,
        response: {
          code: 'FORBIDDEN',
          message: 'この操作を行う権限がありません',
        },
      };
    case 'InvalidIdFormat':
      return invalidIdFormatResponse(error.field);
  }
}

export function mapListCheckInsErrorToResponse(error: ListCheckInsError): ErrorResponse {
  switch (error.type) {
    case 'Unauthorized':
      return {
        status: 403,
        response: {
          code: 'FORBIDDEN',
          message: 'この操作を行う権限がありません',
        },
      };
    case 'InvalidIdFormat':
      return invalidIdFormatResponse(error.field);
  }
}
