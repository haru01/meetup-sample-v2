import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus } from '@shared/event-bus';
import { createRejectMemberCommand } from '../reject-member.command';
import type { CommunityRepository } from '../../../repositories/community.repository';
import type { CommunityMemberRepository } from '../../../repositories/community-member.repository';
import type { Community } from '../../../models/community';
import type { CommunityMember } from '../../../models/community-member';
import type { CommunityDomainEvent } from '../../../errors/community-errors';
import { testCommunityId, testCommunityMemberId, testAccountId } from '@shared/testing/test-ids';

const occurredAt = new Date('2026-02-01T00:00:00Z');

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
const pendingAccountId = testAccountId('pending-account-1');

const pendingMember: CommunityMember = {
  id: targetMemberId,
  communityId: community.id,
  accountId: pendingAccountId,
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
  let eventBus: InMemoryEventBus<CommunityDomainEvent>;
  let useCase: ReturnType<typeof createRejectMemberCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    eventBus = new InMemoryEventBus<CommunityDomainEvent>();
    useCase = createRejectMemberCommand(communityRepo, memberRepo, eventBus);
  });

  describe('正常系', () => {
    it('PENDINGメンバーを拒否するとメンバーレコードを削除する', async () => {
      const result = await useCase({
        communityId: community.id,
        targetMemberId,
        occurredAt,
      });

      expect(result.ok).toBe(true);
      expect(memberRepo.delete).toHaveBeenCalledWith(targetMemberId);
    });

    it('MemberRejected イベントを発行する', async () => {
      const handler = vi.fn();
      eventBus.subscribe('MemberRejected', handler);

      await useCase({
        communityId: community.id,
        targetMemberId,
        occurredAt,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MemberRejected',
          communityId: community.id,
          memberId: targetMemberId,
          accountId: pendingAccountId,
          occurredAt,
        })
      );
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合はCommunityNotFoundエラーを返す', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);

      const result = await useCase({
        communityId: testCommunityId('non-existent'),
        targetMemberId,
        occurredAt,
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
        occurredAt,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberNotFound');
      }
    });

    it('異常系ではイベントを発行しない', async () => {
      vi.mocked(memberRepo.findById).mockResolvedValue(null);
      const handler = vi.fn();
      eventBus.subscribe('MemberRejected', handler);

      await useCase({
        communityId: community.id,
        targetMemberId: testCommunityMemberId('non-existent'),
        occurredAt,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
