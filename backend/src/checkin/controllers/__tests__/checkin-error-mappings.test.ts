import { describe, it, expect } from 'vitest';
import {
  mapCheckInErrorToResponse,
  mapListCheckInsErrorToResponse,
} from '../checkin-error-mappings';

describe('mapCheckInErrorToResponse', () => {
  it('ParticipationNotFound は 404 PARTICIPATION_NOT_FOUND を返す', () => {
    expect(mapCheckInErrorToResponse({ type: 'ParticipationNotFound' })).toEqual({
      status: 404,
      response: { code: 'PARTICIPATION_NOT_FOUND', message: '参加申し込みが見つかりません' },
    });
  });

  it('ParticipationNotApproved は 422 PARTICIPATION_NOT_APPROVED を返す', () => {
    expect(mapCheckInErrorToResponse({ type: 'ParticipationNotApproved' })).toEqual({
      status: 422,
      response: { code: 'PARTICIPATION_NOT_APPROVED', message: '参加申し込みが承認されていません' },
    });
  });

  it('CheckInAlreadyExists は 409 CHECKIN_ALREADY_EXISTS を返す', () => {
    expect(mapCheckInErrorToResponse({ type: 'CheckInAlreadyExists' })).toEqual({
      status: 409,
      response: { code: 'CHECKIN_ALREADY_EXISTS', message: '既にチェックイン済みです' },
    });
  });

  it('Unauthorized は 403 FORBIDDEN を返す', () => {
    expect(mapCheckInErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
    });
  });
});

describe('mapListCheckInsErrorToResponse', () => {
  it('Unauthorized は 403 FORBIDDEN を返す', () => {
    expect(mapListCheckInsErrorToResponse({ type: 'Unauthorized' })).toEqual({
      status: 403,
      response: { code: 'FORBIDDEN', message: 'この操作を行う権限がありません' },
    });
  });
});
