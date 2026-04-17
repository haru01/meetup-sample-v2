import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApproveMemberCommand } from '../approve-member.command';
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

const community: Community = {
  id: createCommunityId('community-1'),
  name: 'テストコミュニティ',
  description: null,
  category: 'TECH',
  visibility: 'PRIVATE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const targetAccountId = createAccountId('target-account-1');
const targetMemberId = createCommunityMemberId('target-member-1');

const pendingMember: CommunityMember = {
  id: targetMemberId,
  communityId: community.id,
  accountId: targetAccountId,
  role: 'MEMBER',
  status: 'PENDING',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const activeMember: CommunityMember = {
  id: targetMemberId,
  communityId: community.id,
  accountId: targetAccountId,
  role: 'MEMBER',
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
  findByIds: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(pendingMember),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  findByCommunityId: vi.fn().mockResolvedValue({ members: [], total: 0 }),
});

// ============================================================
// テスト
// ============================================================

describe('ApproveMemberCommand', () => {
  let communityRepo: CommunityRepository;
  let memberRepo: CommunityMemberRepository;
  let useCase: ReturnType<typeof createApproveMemberCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    useCase = createApproveMemberCommand(communityRepo, memberRepo);
  });

  describe('正常系', () => {
    it('PENDINGメンバーを承認するとACTIVEになる', async () => {
      const result = await useCase({
        communityId: community.id,
        targetMemberId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('ACTIVE');
      }
    });

    it('承認したメンバーをリポジトリに保存する', async () => {
      await useCase({
        communityId: community.id,
        targetMemberId,
      });

      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合はCommunityNotFoundエラーを返す', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: createCommunityId('non-existent'),
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
        targetMemberId: createCommunityMemberId('non-existent'),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberNotFound');
      }
    });

    it('すでにACTIVEなメンバーを承認するとMemberAlreadyActiveエラーを返す', async () => {
      vi.mocked(memberRepo.findById).mockResolvedValue(activeMember);

      const result = await useCase({
        communityId: community.id,
        targetMemberId,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberAlreadyActive');
      }
    });
  });
});
