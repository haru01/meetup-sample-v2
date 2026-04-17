import { describe, it, expect } from 'vitest';
import {
  mapApplyForEventErrorToResponse,
  mapApproveParticipationsErrorToResponse,
  mapCancelParticipationErrorToResponse,
  mapGetApplicationListErrorToResponse,
  mapGetRemainingCapacityErrorToResponse,
} from '../participation-error-mappings';

describe('mapApplyForEventErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapApplyForEventErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });

  it('EventNotPublished は 422 EVENT_NOT_PUBLISHED を返す', () => {
    expect(mapApplyForEventErrorToResponse({ type: 'EventNotPublished' })).toEqual({
      status: 422,
      response: { code: 'EVENT_NOT_PUBLISHED', message: 'イベントが公開されていません' },
    });
  });

  it('AlreadyApplied は 409 ALREADY_APPLIED を返す', () => {
    expect(mapApplyForEventErrorToResponse({ type: 'AlreadyApplied' })).toEqual({
      status: 409,
      response: { code: 'ALREADY_APPLIED', message: 'すでに申込済みです' },
    });
  });
});

describe('mapApproveParticipationsErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapApproveParticipationsErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });

  it('Unauthorized は 403 FORBIDDEN を返す', () => {
    expect(mapApproveParticipationsErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'FORBIDDEN', message: '権限がありません' },
    });
  });

  it('ParticipationNotFound は 404 PARTICIPATION_NOT_FOUND を返す', () => {
    expect(mapApproveParticipationsErrorToResponse({ type: 'ParticipationNotFound' })).toEqual({
      status: 404,
      response: { code: 'PARTICIPATION_NOT_FOUND', message: '参加申込が見つかりません' },
    });
  });

  it('ParticipationInvalidStatus は 422 を返し、current ステータスをメッセージに埋め込む', () => {
    expect(
      mapApproveParticipationsErrorToResponse({
        type: 'ParticipationInvalidStatus',
        current: 'APPROVED',
      })
    ).toEqual({
      status: 422,
      response: {
        code: 'PARTICIPATION_INVALID_STATUS',
        message: '現在のステータス(APPROVED)では承認できません',
      },
    });
  });
});

describe('mapCancelParticipationErrorToResponse', () => {
  it('ParticipationNotFound は 404 PARTICIPATION_NOT_FOUND を返す', () => {
    expect(mapCancelParticipationErrorToResponse({ type: 'ParticipationNotFound' })).toEqual({
      status: 404,
      response: { code: 'PARTICIPATION_NOT_FOUND', message: '参加申込が見つかりません' },
    });
  });

  it('Unauthorized は 403 FORBIDDEN を返す', () => {
    expect(mapCancelParticipationErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'FORBIDDEN', message: '権限がありません' },
    });
  });

  it('ParticipationInvalidStatus は 422 を返し、current ステータスをメッセージに埋め込む', () => {
    expect(
      mapCancelParticipationErrorToResponse({
        type: 'ParticipationInvalidStatus',
        current: 'CANCELLED',
      })
    ).toEqual({
      status: 422,
      response: {
        code: 'PARTICIPATION_INVALID_STATUS',
        message: '現在のステータス(CANCELLED)ではキャンセルできません',
      },
    });
  });
});

describe('mapGetApplicationListErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapGetApplicationListErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });

  it('Unauthorized は 403 FORBIDDEN を返す', () => {
    expect(mapGetApplicationListErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'FORBIDDEN', message: '権限がありません' },
    });
  });
});

describe('mapGetRemainingCapacityErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapGetRemainingCapacityErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });
});
