import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCreateCommunityCommand } from '../create-community.command';
import type { CreateCommunityInput } from '../create-community.command';
import type { CommunityRepository } from '../../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../../repositories/community-member.repository';
import { InMemoryEventBus } from '@shared/event-bus';
import type { CommunityCreatedEvent } from '../../../errors/community-errors';
import { createCommunityId } from '@shared/schemas/id-factories';
import { createCommunityMemberId } from '@shared/schemas/id-factories';
import { createAccountId } from '@shared/schemas/id-factories';

// ============================================================
// テスト用フィクスチャ
// ============================================================

const makeCommand = (): CreateCommunityInput => ({
  accountId: createAccountId('account-1'),
  name: 'テストコミュニティ',
  description: 'テスト用コミュニティです',
  category: 'TECH' as const,
  visibility: 'PUBLIC' as const,
  id: createCommunityId('community-1'),
  ownerMemberId: createCommunityMemberId('member-1'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

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

describe('CreateCommunityCommand', () => {
  let communityRepo: CommunityRepository;
  let memberRepo: CommunityMemberRepository;
  let eventBus: InMemoryEventBus<CommunityCreatedEvent>;
  let useCase: ReturnType<typeof createCreateCommunityCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    eventBus = new InMemoryEventBus<CommunityCreatedEvent>();
    useCase = createCreateCommunityCommand(communityRepo, memberRepo, eventBus);
  });

  describe('正常系', () => {
    it('コミュニティとオーナーメンバーを作成し保存する', async () => {
      const cmd = makeCommand();

      const result = await useCase(cmd);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.community.id).toBe(cmd.id);
        expect(result.value.community.name).toBe(cmd.name);
        expect(result.value.ownerMember.communityId).toBe(cmd.id);
        expect(result.value.ownerMember.accountId).toBe(cmd.accountId);
        expect(result.value.ownerMember.role).toBe('OWNER');
      }
    });

    it('コミュニティとオーナーメンバーをリポジトリに保存する', async () => {
      const cmd = makeCommand();

      await useCase(cmd);

      expect(communityRepo.save).toHaveBeenCalledTimes(1);
      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });

    it('CommunityCreatedイベントを発行する', async () => {
      const cmd = makeCommand();
      const handler = vi.fn();
      eventBus.subscribe('CommunityCreated', handler);

      await useCase(cmd);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CommunityCreated',
          communityId: cmd.id,
          accountId: cmd.accountId,
          name: cmd.name,
        })
      );
    });
  });

  describe('異常系', () => {
    it('同名のコミュニティが存在する場合はDuplicateCommunityNameエラーを返す', async () => {
      const cmd = makeCommand();
      const existing = {
        id: createCommunityId('other-id'),
        name: cmd.name,
        description: null,
        category: 'TECH' as const,
        visibility: 'PUBLIC' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(communityRepo.findByName).mockResolvedValue(existing);

      const result = await useCase(cmd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('DuplicateCommunityName');
        if (result.error.type === 'DuplicateCommunityName') {
          expect(result.error.name).toBe(cmd.name);
        }
      }
    });

    it('オーナーが10個以上のコミュニティを持つ場合はTooManyCommunitiesエラーを返す', async () => {
      const cmd = makeCommand();
      vi.mocked(communityRepo.countByOwnerAccountId).mockResolvedValue(10);

      const result = await useCase(cmd);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('TooManyCommunities');
      }
    });

    it('上限未満（9個）の場合は作成できる', async () => {
      const cmd = makeCommand();
      vi.mocked(communityRepo.countByOwnerAccountId).mockResolvedValue(9);

      const result = await useCase(cmd);

      expect(result.ok).toBe(true);
    });
  });
});
