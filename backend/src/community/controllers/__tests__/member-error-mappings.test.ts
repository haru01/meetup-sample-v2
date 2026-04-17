import { describe, it, expect } from 'vitest';
import {
  mapJoinCommunityErrorToResponse,
  mapLeaveCommunityErrorToResponse,
  mapApproveMemberErrorToResponse,
  mapRejectMemberErrorToResponse,
  mapListMembersErrorToResponse,
} from '../member-error-mappings';

describe('mapJoinCommunityErrorToResponse', () => {
  it('CommunityNotFound は 404 COMMUNITY_NOT_FOUND を返す', () => {
    const result = mapJoinCommunityErrorToResponse({ type: 'CommunityNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' },
    });
  });

  it('AlreadyMember は 409 ALREADY_MEMBER を返す', () => {
    const result = mapJoinCommunityErrorToResponse({ type: 'AlreadyMember' });

    expect(result).toEqual({
      status: 409,
      response: { code: 'ALREADY_MEMBER', message: '既にこのコミュニティのメンバーです' },
    });
  });
});

describe('mapLeaveCommunityErrorToResponse', () => {
  it('CommunityNotFound は 404 COMMUNITY_NOT_FOUND を返す', () => {
    const result = mapLeaveCommunityErrorToResponse({ type: 'CommunityNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' },
    });
  });

  it('MemberNotFound は 404 MEMBER_NOT_FOUND を返す', () => {
    const result = mapLeaveCommunityErrorToResponse({ type: 'MemberNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'MEMBER_NOT_FOUND', message: 'メンバーが見つかりません' },
    });
  });

  it('OwnerCannotLeave は 422 OWNER_CANNOT_LEAVE を返す', () => {
    const result = mapLeaveCommunityErrorToResponse({ type: 'OwnerCannotLeave' });

    expect(result).toEqual({
      status: 422,
      response: { code: 'OWNER_CANNOT_LEAVE', message: 'オーナーはコミュニティを脱退できません' },
    });
  });
});

describe('mapApproveMemberErrorToResponse', () => {
  it('CommunityNotFound は 404 COMMUNITY_NOT_FOUND を返す', () => {
    const result = mapApproveMemberErrorToResponse({ type: 'CommunityNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' },
    });
  });

  it('MemberNotFound は 404 MEMBER_NOT_FOUND を返す', () => {
    const result = mapApproveMemberErrorToResponse({ type: 'MemberNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'MEMBER_NOT_FOUND', message: 'メンバーが見つかりません' },
    });
  });

  it('MemberAlreadyActive は 422 MEMBER_ALREADY_ACTIVE を返す', () => {
    const result = mapApproveMemberErrorToResponse({ type: 'MemberAlreadyActive' });

    expect(result).toEqual({
      status: 422,
      response: { code: 'MEMBER_ALREADY_ACTIVE', message: 'メンバーは既にアクティブです' },
    });
  });
});

describe('mapRejectMemberErrorToResponse', () => {
  it('CommunityNotFound は 404 COMMUNITY_NOT_FOUND を返す', () => {
    const result = mapRejectMemberErrorToResponse({ type: 'CommunityNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' },
    });
  });

  it('MemberNotFound は 404 MEMBER_NOT_FOUND を返す', () => {
    const result = mapRejectMemberErrorToResponse({ type: 'MemberNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'MEMBER_NOT_FOUND', message: 'メンバーが見つかりません' },
    });
  });
});

describe('mapListMembersErrorToResponse', () => {
  it('CommunityNotFound は 404 COMMUNITY_NOT_FOUND を返す', () => {
    const result = mapListMembersErrorToResponse({ type: 'CommunityNotFound' });

    expect(result).toEqual({
      status: 404,
      response: { code: 'COMMUNITY_NOT_FOUND', message: 'コミュニティが見つかりません' },
    });
  });
});
