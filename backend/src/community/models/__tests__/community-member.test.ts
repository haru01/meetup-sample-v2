import { describe, it, expect } from 'vitest';
import { joinCommunity, leaveCommunity, approveMember } from '../community-member';
import type { Community } from '../community';
import type { CommunityMember } from '../community-member';
import {
  createCommunityId,
  createCommunityMemberId,
  createAccountId,
} from '@shared/schemas/id-factories';
import type { CommunityVisibility } from '../schemas/community.schema';
import { CommunityMemberRole, CommunityMemberStatus } from '../schemas/member.schema';

const makeCommunity = (visibility: CommunityVisibility): Community => ({
  id: createCommunityId(),
  name: 'テストコミュニティ',
  description: null,
  category: 'TECH',
  visibility,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
});

const makeMember = (overrides: Partial<CommunityMember> = {}): CommunityMember => ({
  id: createCommunityMemberId(),
  communityId: createCommunityId(),
  accountId: createAccountId(),
  role: CommunityMemberRole.MEMBER,
  status: CommunityMemberStatus.ACTIVE,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('joinCommunity', () => {
  it('PUBLICコミュニティに参加するとACTIVEステータスのメンバーが返る', () => {
    const community = makeCommunity('PUBLIC');
    const accountId = createAccountId();
    const memberId = createCommunityMemberId();
    const result = joinCommunity({ community, accountId, memberId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('ACTIVE');
    expect(result.value.role).toBe('MEMBER');
    expect(result.value.accountId).toBe(accountId);
    expect(result.value.communityId).toBe(community.id);
    expect(result.value.id).toBe(memberId);
  });

  it('PRIVATEコミュニティに参加するとPENDINGステータスのメンバーが返る', () => {
    const community = makeCommunity('PRIVATE');
    const accountId = createAccountId();
    const memberId = createCommunityMemberId();
    const result = joinCommunity({ community, accountId, memberId });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('PENDING');
    expect(result.value.role).toBe('MEMBER');
  });
});

describe('leaveCommunity', () => {
  it('MEMBERロールのメンバーは脱退できる', () => {
    const member = makeMember({ role: 'MEMBER' });
    const result = leaveCommunity(member);
    expect(result.ok).toBe(true);
  });

  it('ADMINロールのメンバーは脱退できる', () => {
    const member = makeMember({ role: 'ADMIN' });
    const result = leaveCommunity(member);
    expect(result.ok).toBe(true);
  });

  it('OWNERロールのメンバーは脱退できない', () => {
    const member = makeMember({ role: 'OWNER' });
    const result = leaveCommunity(member);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('OwnerCannotLeave');
  });
});

describe('approveMember', () => {
  it('PENDINGメンバーをACTIVEに承認できる', () => {
    const member = makeMember({ status: 'PENDING' });
    const result = approveMember(member);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('ACTIVE');
    expect(result.value.id).toBe(member.id);
    expect(result.value.communityId).toBe(member.communityId);
    expect(result.value.accountId).toBe(member.accountId);
  });

  it('すでにACTIVEなメンバーを承認するとMemberAlreadyActiveエラーが返る', () => {
    const member = makeMember({ status: 'ACTIVE' });
    const result = approveMember(member);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('MemberAlreadyActive');
  });
});
