import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createJoinCommunityCommand } from '../join-community.command';
import type { CommunityRepository } from '../../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../../repositories/community-member.repository';
import type { Community } from '../../../models/community';
import type { CommunityMember } from '../../../models/community-member';
import { createCommunityId } from '@shared/schemas/id-factories';
import { createCommunityMemberId } from '@shared/schemas/id-factories';
import { createAccountId } from '@shared/schemas/id-factories';

// ============================================================
// テスト用フィクスチャ
// ============================================================

const publicCommunity: Community = {
  id: createCommunityId('community-1'),
  name: 'パブリックコミュニティ',
  description: null,
  category: 'TECH',
  visibility: 'PUBLIC',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const privateCommunity: Community = {
  id: createCommunityId('community-2'),
  name: 'プライベートコミュニティ',
  description: null,
  category: 'TECH',
  visibility: 'PRIVATE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const accountId = createAccountId('account-1');
const memberId = createCommunityMemberId('member-1');

const existingMember: CommunityMember = {
  id: memberId,
  communityId: publicCommunity.id,
  accountId,
  role: 'MEMBER',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const makeCommunityRepository = (): CommunityRepository => ({
  findById: vi.fn().mockResolvedValue(publicCommunity),
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
  findByCommunityId: vi.fn().mockResolvedValue({ members: [], total: 0 }),
});

// ============================================================
// テスト
// ============================================================

describe('JoinCommunityCommand', () => {
  let communityRepo: CommunityRepository;
  let memberRepo: CommunityMemberRepository;
  let useCase: ReturnType<typeof createJoinCommunityCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    useCase = createJoinCommunityCommand(communityRepo, memberRepo);
  });

  describe('正常系', () => {
    it('PUBLICコミュニティに参加するとACTIVEメンバーになる', async () => {
      const result = await useCase({
        communityId: publicCommunity.id,
        accountId,
        memberId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('ACTIVE');
        expect(result.value.role).toBe('MEMBER');
        expect(result.value.accountId).toBe(accountId);
      }
    });

    it('PRIVATEコミュニティに参加するとPENDINGメンバーになる', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(privateCommunity);

      const result = await useCase({
        communityId: privateCommunity.id,
        accountId,
        memberId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('PENDING');
      }
    });

    it('参加したメンバーをリポジトリに保存する', async () => {
      await useCase({
        communityId: publicCommunity.id,
        accountId,
        memberId,
      });

      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合はCommunityNotFoundエラーを返す', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: createCommunityId('non-existent'),
        accountId,
        memberId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });

    it('すでにメンバーの場合はAlreadyMemberエラーを返す', async () => {
      vi.mocked(memberRepo.findByIds).mockResolvedValue(existingMember);

      const result = await useCase({
        communityId: publicCommunity.id,
        accountId,
        memberId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AlreadyMember');
      }
    });
  });
});
