import { describe, it, expect } from 'vitest';
import {
  mapCreateCommunityErrorToResponse,
  mapGetCommunityErrorToResponse,
} from '../community-error-mappings';

describe('mapCreateCommunityErrorToResponse', () => {
  it('DuplicateCommunityName は 409 DUPLICATE_COMMUNITY_NAME を返し、メッセージに name を含む', () => {
    const result = mapCreateCommunityErrorToResponse({
      type: 'DuplicateCommunityName',
      name: 'TypeScript 勉強会',
    });

    expect(result).toEqual({
      status: 409,
      response: {
        code: 'DUPLICATE_COMMUNITY_NAME',
        message: 'このコミュニティ名は既に使用されています: TypeScript 勉強会',
      },
    });
  });

  it('TooManyCommunities は 422 TOO_MANY_COMMUNITIES を返す', () => {
    const result = mapCreateCommunityErrorToResponse({ type: 'TooManyCommunities' });

    expect(result).toEqual({
      status: 422,
      response: {
        code: 'TOO_MANY_COMMUNITIES',
        message: 'コミュニティの作成数が上限に達しています',
      },
    });
  });
});

describe('mapGetCommunityErrorToResponse', () => {
  it('CommunityNotFound は 404 COMMUNITY_NOT_FOUND を返す', () => {
    const result = mapGetCommunityErrorToResponse({ type: 'CommunityNotFound' });

    expect(result).toEqual({
      status: 404,
      response: {
        code: 'COMMUNITY_NOT_FOUND',
        message: 'コミュニティが見つかりません',
      },
    });
  });
});
