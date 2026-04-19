import { describe, it, expect } from 'vitest';
import { mapCreateEventErrorToResponse } from '../event-error-mappings';

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
