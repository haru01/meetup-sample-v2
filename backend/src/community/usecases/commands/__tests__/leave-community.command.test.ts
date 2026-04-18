import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLeaveCommunityCommand } from '../leave-community.command';
import type { CommunityRepository } from '../../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../../repositories/community-member.repository';
import type { Community } from '../../../models/community';
import type { CommunityMember } from '../../../models/community-member';
import { testCommunityId, testCommunityMemberId, testAccountId } from '@shared/testing/test-ids';

// ============================================================
// テスト用フィクスチャ
// ============================================================

const community: Community = {
  id: testCommunityId('community-1'),
  name: 'テストコミュニティ',
  description: null,
  category: 'TECH',
  visibility: 'PUBLIC',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const accountId = testAccountId('account-1');
const memberId = testCommunityMemberId('member-1');

const activeMember: CommunityMember = {
  id: memberId,
  communityId: community.id,
  accountId,
  role: 'MEMBER',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const ownerMember: CommunityMember = {
  id: testCommunityMemberId('owner-member-1'),
  communityId: community.id,
  accountId: testAccountId('owner-account-1'),
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const makeCommunityRepository = (): CommunityRepository => ({
  findById: vi.fn().mockResolvedValue(community),
  findByName: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  findAll: vi.fn().mockResolvedValue({ communities: [], total: 0 }),
  countByOwnerAccountId: vi.fn().mockResolvedValue(0),
});

const makeMemberRepository = (): CommunityMemberRepository => ({
  findByIds: vi.fn().mockResolvedValue(activeMember),
  findById: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  findByCommunityId: vi.fn().mockResolvedValue({ members: [], total: 0 }),
});

// ============================================================
// テスト
// ============================================================

describe('LeaveCommunityCommand', () => {
  let communityRepo: CommunityRepository;
  let memberRepo: CommunityMemberRepository;
  let useCase: ReturnType<typeof createLeaveCommunityCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    useCase = createLeaveCommunityCommand(communityRepo, memberRepo);
  });

  describe('正常系', () => {
    it('メンバーがコミュニティを脱退するとメンバーレコードを削除する', async () => {
      const result = await useCase({
        communityId: community.id,
        accountId,
      });

      expect(result.ok).toBe(true);
      expect(memberRepo.delete).toHaveBeenCalledWith(memberId);
    });
  });

  describe('memberId 指定で脱退', () => {
    it('memberId が自分のメンバーの場合は正常に脱退する', async () => {
      vi.mocked(memberRepo.findById).mockResolvedValue(activeMember);

      const result = await useCase({
        communityId: community.id,
        accountId,
        memberId,
      });

      expect(result.ok).toBe(true);
      expect(memberRepo.findById).toHaveBeenCalledWith(memberId);
      expect(memberRepo.delete).toHaveBeenCalledWith(memberId);
    });

    it('memberId が他人のメンバーの場合は MemberNotFound を返す', async () => {
      vi.mocked(memberRepo.findById).mockResolvedValue({
        ...activeMember,
        accountId: testAccountId('other-account'),
      });

      const result = await useCase({
        communityId: community.id,
        accountId,
        memberId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberNotFound');
      }
    });

    it('memberId が存在しない場合は MemberNotFound を返す', async () => {
      vi.mocked(memberRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: community.id,
        accountId,
        memberId: testCommunityMemberId('non-existent'),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberNotFound');
      }
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合はCommunityNotFoundエラーを返す', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: testCommunityId('non-existent'),
        accountId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });

    it('メンバーが存在しない場合はMemberNotFoundエラーを返す', async () => {
      vi.mocked(memberRepo.findByIds).mockResolvedValue(null);

      const result = await useCase({
        communityId: community.id,
        accountId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberNotFound');
      }
    });

    it('オーナーが脱退しようとするとOwnerCannotLeaveエラーを返す', async () => {
      vi.mocked(memberRepo.findByIds).mockResolvedValue(ownerMember);

      const result = await useCase({
        communityId: community.id,
        accountId: ownerMember.accountId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('OwnerCannotLeave');
      }
    });
  });
});
