import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createListMembersQuery } from '../list-members.query';
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

const member1: CommunityMember = {
  id: testCommunityMemberId('member-1'),
  communityId: community.id,
  accountId: testAccountId('account-1'),
  role: 'OWNER',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const member2: CommunityMember = {
  id: testCommunityMemberId('member-2'),
  communityId: community.id,
  accountId: testAccountId('account-2'),
  role: 'MEMBER',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-02T00:00:00Z'),
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
  findById: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  findByCommunityId: vi.fn().mockResolvedValue({ members: [member1, member2], total: 2 }),
});

// ============================================================
// テスト
// ============================================================

describe('ListMembersQuery', () => {
  let communityRepo: CommunityRepository;
  let memberRepo: CommunityMemberRepository;
  let useCase: ReturnType<typeof createListMembersQuery>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    useCase = createListMembersQuery(communityRepo, memberRepo);
  });

  describe('正常系', () => {
    it('コミュニティメンバー一覧を返す', async () => {
      const result = await useCase({
        communityId: community.id,
        limit: 10,
        offset: 0,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.members).toHaveLength(2);
        expect(result.value.total).toBe(2);
      }
    });

    it('ページネーションパラメータをリポジトリに渡す', async () => {
      await useCase({
        communityId: community.id,
        limit: 5,
        offset: 10,
      });

      expect(memberRepo.findByCommunityId).toHaveBeenCalledWith(
        community.id,
        expect.objectContaining({ limit: 5, offset: 10 })
      );
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合はCommunityNotFoundエラーを返す', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: testCommunityId('non-existent'),
        limit: 10,
        offset: 0,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });
  });
});
