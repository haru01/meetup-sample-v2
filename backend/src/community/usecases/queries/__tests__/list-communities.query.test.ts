import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createListCommunitiesQuery } from '../list-communities.query';
import type { CommunityRepository } from '../../../repositories/community.repository';
import type { Community } from '../../../models/community';
import { createCommunityId } from '@shared/schemas/id-factories';
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

const makeCommunityRepository = (): CommunityRepository => ({
  findById: vi.fn().mockResolvedValue(null),
  findByName: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  findAll: vi.fn().mockResolvedValue({ communities: [publicCommunity], total: 1 }),
  countByOwnerAccountId: vi.fn().mockResolvedValue(0),
});

// ============================================================
// テスト
// ============================================================

describe('ListCommunitiesQuery', () => {
  let communityRepo: CommunityRepository;
  let useCase: ReturnType<typeof createListCommunitiesQuery>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    useCase = createListCommunitiesQuery(communityRepo);
  });

  describe('正常系', () => {
    it('コミュニティ一覧を返す', async () => {
      const result = await useCase({ limit: 10, offset: 0 });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.communities).toHaveLength(1);
        expect(result.value.total).toBe(1);
      }
    });

    it('カテゴリフィルタが指定された場合にfindAllへ渡す', async () => {
      await useCase({ category: 'TECH', limit: 10, offset: 0 });

      expect(communityRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'TECH' })
      );
    });

    it('memberAccountIdが指定された場合にfindAllへ渡す', async () => {
      const accountId = createAccountId('account-1');

      await useCase({ memberAccountId: accountId, limit: 10, offset: 0 });

      expect(communityRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ memberAccountId: accountId })
      );
    });

    it('memberAccountIdが未指定の場合はPUBLICフィルタを適用する', async () => {
      await useCase({ limit: 10, offset: 0 });

      expect(communityRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ visibility: 'PUBLIC' })
      );
    });

    it('ページネーションパラメータをfindAllへ渡す', async () => {
      await useCase({ limit: 5, offset: 10 });

      expect(communityRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5, offset: 10 })
      );
    });

    it('常にResult.okを返す（エラーなし）', async () => {
      vi.mocked(communityRepo.findAll).mockResolvedValue({ communities: [], total: 0 });

      const result = await useCase({ limit: 10, offset: 0 });

      expect(result.ok).toBe(true);
    });
  });
});
