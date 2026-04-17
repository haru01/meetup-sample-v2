import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGetCommunityQuery } from '../get-community.query';
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
  category: 'BUSINESS',
  visibility: 'PRIVATE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const accountId = createAccountId('account-1');
const memberRecord: CommunityMember = {
  id: createCommunityMemberId('member-1'),
  communityId: privateCommunity.id,
  accountId,
  role: 'MEMBER',
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const makeCommunityRepository = (): CommunityRepository => ({
  findById: vi.fn().mockResolvedValue(null),
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

describe('GetCommunityQuery', () => {
  let communityRepo: CommunityRepository;
  let memberRepo: CommunityMemberRepository;
  let useCase: ReturnType<typeof createGetCommunityQuery>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    useCase = createGetCommunityQuery(communityRepo, memberRepo);
  });

  describe('正常系', () => {
    it('PUBLICコミュニティはrequestingAccountIdなしで取得できる', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(publicCommunity);

      const result = await useCase({ communityId: publicCommunity.id });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(publicCommunity.id);
      }
    });

    it('PUBLICコミュニティはrequestingAccountIdありでも取得できる', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(publicCommunity);

      const result = await useCase({
        communityId: publicCommunity.id,
        requestingAccountId: accountId,
      });

      expect(result.ok).toBe(true);
    });

    it('PRIVATEコミュニティはメンバーのアカウントで取得できる', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(privateCommunity);
      vi.mocked(memberRepo.findByIds).mockResolvedValue(memberRecord);

      const result = await useCase({
        communityId: privateCommunity.id,
        requestingAccountId: accountId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(privateCommunity.id);
      }
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合はCommunityNotFoundエラーを返す', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: createCommunityId('non-existent'),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });

    it('PRIVATEコミュニティはrequestingAccountIdなしで取得できない', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(privateCommunity);

      const result = await useCase({ communityId: privateCommunity.id });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });

    it('PRIVATEコミュニティは非メンバーのアカウントで取得できない', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(privateCommunity);
      vi.mocked(memberRepo.findByIds).mockResolvedValue(null);

      const result = await useCase({
        communityId: privateCommunity.id,
        requestingAccountId: createAccountId('other-account'),
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });
  });
});
