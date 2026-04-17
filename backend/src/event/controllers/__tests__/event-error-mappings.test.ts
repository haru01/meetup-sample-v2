import { describe, it, expect } from 'vitest';
import {
  mapPublishEventErrorToResponse,
  mapUpdateEventErrorToResponse,
  mapCloseEventErrorToResponse,
  mapCancelEventErrorToResponse,
  mapCreateEventErrorToResponse,
} from '../event-error-mappings';

describe('mapPublishEventErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapPublishEventErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });

  it('Unauthorized は 403 UNAUTHORIZED を返す', () => {
    expect(mapPublishEventErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'UNAUTHORIZED', message: '作成者のみ操作可能です' },
    });
  });

  it('EventAlreadyPublished は 409 EVENT_ALREADY_PUBLISHED を返す', () => {
    expect(mapPublishEventErrorToResponse({ type: 'EventAlreadyPublished' })).toEqual({
      status: 409,
      response: { code: 'EVENT_ALREADY_PUBLISHED', message: 'イベントは既に公開されています' },
    });
  });
});

describe('mapUpdateEventErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapUpdateEventErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });

  it('Unauthorized は 403 UNAUTHORIZED を返す', () => {
    expect(mapUpdateEventErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'UNAUTHORIZED', message: '作成者のみ操作可能です' },
    });
  });

  it('EventNotEditable は 409 EVENT_NOT_EDITABLE を返す', () => {
    expect(mapUpdateEventErrorToResponse({ type: 'EventNotEditable' })).toEqual({
      status: 409,
      response: { code: 'EVENT_NOT_EDITABLE', message: 'イベントは編集できない状態です' },
    });
  });
});

describe('mapCloseEventErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapCloseEventErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });

  it('Unauthorized は 403 UNAUTHORIZED を返す', () => {
    expect(mapCloseEventErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'UNAUTHORIZED', message: '作成者のみ操作可能です' },
    });
  });

  it('EventNotYetHeld は 409 EVENT_NOT_YET_HELD を返す', () => {
    expect(mapCloseEventErrorToResponse({ type: 'EventNotYetHeld' })).toEqual({
      status: 409,
      response: { code: 'EVENT_NOT_YET_HELD', message: 'イベントはクローズできない状態です' },
    });
  });
});

describe('mapCancelEventErrorToResponse', () => {
  it('EventNotFound は 404 EVENT_NOT_FOUND を返す', () => {
    expect(mapCancelEventErrorToResponse({ type: 'EventNotFound' })).toEqual({
      status: 404,
      response: { code: 'EVENT_NOT_FOUND', message: 'イベントが見つかりません' },
    });
  });

  it('Unauthorized は 403 UNAUTHORIZED を返す', () => {
    expect(mapCancelEventErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'UNAUTHORIZED', message: '作成者のみ操作可能です' },
    });
  });

  it('EventAlreadyOccurred は 409 EVENT_ALREADY_OCCURRED を返す', () => {
    expect(mapCancelEventErrorToResponse({ type: 'EventAlreadyOccurred' })).toEqual({
      status: 409,
      response: { code: 'EVENT_ALREADY_OCCURRED', message: 'イベントは中止できない状態です' },
    });
  });
});

describe('mapCreateEventErrorToResponse', () => {
  it('CommunityNotFound は 404 COMMUNITY_NOT_FOUND を返す', () => {
    expect(mapCreateEventErrorToResponse({ type: 'CommunityNotFound' })).toEqual({
      status: 404,
      response: { code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' },
    });
  });

  it('EventDateInPast は 422 EVENT_DATE_IN_PAST を返す', () => {
    expect(mapCreateEventErrorToResponse({ type: 'EventDateInPast' })).toEqual({
      status: 422,
      response: {
        code: 'EVENT_DATE_IN_PAST',
        message: '開始日時は現在時刻より未来でなければなりません',
      },
    });
  });

  it('EventEndBeforeStart は 422 EVENT_END_BEFORE_START を返す', () => {
    expect(mapCreateEventErrorToResponse({ type: 'EventEndBeforeStart' })).toEqual({
      status: 422,
      response: {
        code: 'EVENT_END_BEFORE_START',
        message: '終了日時は開始日時より後でなければなりません',
      },
    });
  });
});
