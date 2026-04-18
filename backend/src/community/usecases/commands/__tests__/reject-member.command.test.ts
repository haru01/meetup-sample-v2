import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRejectMemberCommand } from '../reject-member.command';
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
  visibility: 'PRIVATE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const targetMemberId = testCommunityMemberId('target-member-1');

const pendingMember: CommunityMember = {
  id: targetMemberId,
  communityId: community.id,
  accountId: testAccountId('pending-account-1'),
  role: 'MEMBER',
  status: 'PENDING',
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
  findByIds: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(pendingMember),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  findByCommunityId: vi.fn().mockResolvedValue({ members: [], total: 0 }),
});

// ============================================================
// テスト
// ============================================================

describe('RejectMemberCommand', () => {
  let communityRepo: CommunityRepository;
  let memberRepo: CommunityMemberRepository;
  let useCase: ReturnType<typeof createRejectMemberCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    useCase = createRejectMemberCommand(communityRepo, memberRepo);
  });

  describe('正常系', () => {
    it('PENDINGメンバーを拒否するとメンバーレコードを削除する', async () => {
      const result = await useCase({
        communityId: community.id,
        targetMemberId,
      });

      expect(result.ok).toBe(true);
      expect(memberRepo.delete).toHaveBeenCalledWith(targetMemberId);
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合はCommunityNotFoundエラーを返す', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: testCommunityId('non-existent'),
        targetMemberId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });

    it('対象メンバーが存在しない場合はMemberNotFoundエラーを返す', async () => {
      vi.mocked(memberRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: community.id,
        targetMemberId: testCommunityMemberId('non-existent'),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberNotFound');
      }
    });
  });
});
