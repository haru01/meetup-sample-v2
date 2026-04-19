import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus } from '@shared/event-bus';
import { createJoinCommunityCommand } from '../join-community.command';
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

const publicCommunity: Community = {
  id: testCommunityId('community-1'),
  name: 'パブリックコミュニティ',
  description: null,
  category: 'TECH',
  visibility: 'PUBLIC',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const privateCommunity: Community = {
  id: testCommunityId('community-2'),
  name: 'プライベートコミュニティ',
  description: null,
  category: 'TECH',
  visibility: 'PRIVATE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const accountId = testAccountId('account-1');
const memberId = testCommunityMemberId('member-1');

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
  let eventBus: InMemoryEventBus<CommunityDomainEvent>;
  let useCase: ReturnType<typeof createJoinCommunityCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    memberRepo = makeMemberRepository();
    eventBus = new InMemoryEventBus<CommunityDomainEvent>();
    useCase = createJoinCommunityCommand(communityRepo, memberRepo, eventBus);
  });

  describe('正常系', () => {
    it('PUBLICコミュニティに参加するとACTIVEメンバーになる', async () => {
      const result = await useCase({
        communityId: publicCommunity.id,
        accountId,
        memberId,
        occurredAt,
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
        occurredAt,
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
        occurredAt,
      });

      expect(memberRepo.save).toHaveBeenCalledTimes(1);
    });

    it('PUBLIC のとき MemberJoined イベントを発行する', async () => {
      const handler = vi.fn();
      eventBus.subscribe('MemberJoined', handler);

      await useCase({
        communityId: publicCommunity.id,
        accountId,
        memberId,
        occurredAt,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MemberJoined',
          communityId: publicCommunity.id,
          accountId,
          memberId,
          occurredAt,
        })
      );
    });

    it('PRIVATE のとき MemberApplicationSubmitted イベントを発行する', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(privateCommunity);
      const handler = vi.fn();
      eventBus.subscribe('MemberApplicationSubmitted', handler);

      await useCase({
        communityId: privateCommunity.id,
        accountId,
        memberId,
        occurredAt,
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MemberApplicationSubmitted',
          communityId: privateCommunity.id,
          accountId,
          memberId,
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
        accountId,
        memberId,
        occurredAt,
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
        occurredAt,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('AlreadyMember');
      }
    });

    it('異常系ではイベントを発行しない', async () => {
      vi.mocked(communityRepo.findById).mockResolvedValue(null);
      const joinedHandler = vi.fn();
      const submittedHandler = vi.fn();
      eventBus.subscribe('MemberJoined', joinedHandler);
      eventBus.subscribe('MemberApplicationSubmitted', submittedHandler);

      await useCase({
        communityId: testCommunityId('non-existent'),
        accountId,
        memberId,
        occurredAt,
      });

      expect(joinedHandler).not.toHaveBeenCalled();
      expect(submittedHandler).not.toHaveBeenCalled();
    });
  });
});
