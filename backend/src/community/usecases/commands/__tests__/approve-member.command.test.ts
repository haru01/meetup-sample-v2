import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus } from '@shared/event-bus';
import { createApproveMemberCommand } from '../approve-member.command';
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

const targetAccountId = testAccountId('target-account-1');
const targetMemberId = testCommunityMemberId('target-member-1');

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
  let eventBus: InMemoryEventBus<CommunityDomainEvent>;
  let useCase: ReturnType<typeof createApproveMemberCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    eventBus = new InMemoryEventBus<CommunityDomainEvent>();
    useCase = createApproveMemberCommand(communityRepo, memberRepo, eventBus);
  });

  describe('正常系', () => {
    it('PENDINGメンバーを承認するとACTIVEになる', async () => {
      const result = await useCase({
        communityId: community.id,
        targetMemberId,
        occurredAt,
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
        occurredAt,
      });

      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });

    it('MemberApproved イベントを発行する', async () => {
      const handler = vi.fn();
      eventBus.subscribe('MemberApproved', handler);

      await useCase({
        communityId: community.id,
        targetMemberId,
        occurredAt,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MemberApproved',
          communityId: community.id,
          memberId: targetMemberId,
          accountId: targetAccountId,
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

    it('すでにACTIVEなメンバーを承認するとMemberAlreadyActiveエラーを返す', async () => {
      vi.mocked(memberRepo.findById).mockResolvedValue(activeMember);

      const result = await useCase({
        communityId: community.id,
        targetMemberId,
        occurredAt,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('MemberAlreadyActive');
      }
    });

    it('異常系ではイベントを発行しない', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);
      const handler = vi.fn();
      eventBus.subscribe('MemberApproved', handler);

      await useCase({
        communityId: testCommunityId('non-existent'),
        targetMemberId,
        occurredAt,
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
