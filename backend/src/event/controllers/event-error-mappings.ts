import type { ErrorResponse } from '@shared/controllers/error-response';
import type {
  PublishEventError,
  UpdateEventError,
  CloseEventError,
  CancelEventError,
  EventNotFoundError,
  UnauthorizedError,
  EventAlreadyPublishedError,
  EventNotEditableError,
  EventNotYetHeldError,
  EventAlreadyOccurredError,
} from '../errors/event-errors';

// ============================================================
// HTTP レスポンスマッピング
// ============================================================

function mapNotFound(_error: EventNotFoundError): ErrorResponse {
  return {
    status: 404,
    response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
  };
}

function mapUnauthorized(_error: UnauthorizedError): ErrorResponse {
  return {
    status: 403,
    response: { code: 'UNAUTHORIZED', message: '作成者のみ操作可能です' },
  };
}

function mapAlreadyPublished(_error: EventAlreadyPublishedError): ErrorResponse {
  return {
    status: 409,
    response: { code: 'EVENT_ALREADY_PUBLISHED', message: 'イベントは既に公開されています' },
  };
}

function mapNotEditable(_error: EventNotEditableError): ErrorResponse {
  return {
    status: 409,
    response: { code: 'EVENT_NOT_EDITABLE', message: 'イベントは編集できない状態です' },
  };
}

function mapNotYetHeld(_error: EventNotYetHeldError): ErrorResponse {
  return {
    status: 409,
    response: { code: 'EVENT_NOT_YET_HELD', message: 'イベントはクローズできない状態です' },
  };
}

function mapAlreadyOccurred(_error: EventAlreadyOccurredError): ErrorResponse {
  return {
    status: 409,
    response: { code: 'EVENT_ALREADY_OCCURRED', message: 'イベントは中止できない状態です' },
  };
}

export function mapPublishEventErrorToResponse(error: PublishEventError): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return mapNotFound(error);
    case 'Unauthorized':
      return mapUnauthorized(error);
    case 'EventAlreadyPublished':
      return mapAlreadyPublished(error);
  }
}

export function mapUpdateEventErrorToResponse(error: UpdateEventError): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return mapNotFound(error);
    case 'Unauthorized':
      return mapUnauthorized(error);
    case 'EventNotEditable':
      return mapNotEditable(error);
  }
}

export function mapCloseEventErrorToResponse(error: CloseEventError): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return mapNotFound(error);
    case 'Unauthorized':
      return mapUnauthorized(error);
    case 'EventNotYetHeld':
      return mapNotYetHeld(error);
  }
}

export function mapCancelEventErrorToResponse(error: CancelEventError): ErrorResponse {
  switch (error.type) {
    case 'EventNotFound':
      return mapNotFound(error);
    case 'Unauthorized':
      return mapUnauthorized(error);
    case 'EventAlreadyOccurred':
      return mapAlreadyOccurred(error);
  }
}
