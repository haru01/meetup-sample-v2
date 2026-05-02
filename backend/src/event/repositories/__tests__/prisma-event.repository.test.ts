import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaEventRepository } from '../prisma-event.repository';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearMeetupTables,
} from '../../../infrastructure/test-helper';
import type { PrismaClient } from '@prisma/client';
import { createEventId, createCommunityId, createAccountId } from '@shared/schemas/id-factories';
import type { EventId, CommunityId, AccountId } from '@shared/schemas/common';
import { EventStatus } from '../../models/schemas/event.schema';

// ============================================================
// PrismaEventRepository 統合テスト
// ============================================================

describe('PrismaEventRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaEventRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    repository = new PrismaEventRepository(prisma);
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  async function テストアカウントを作成する(): Promise<AccountId> {
    const id = createAccountId();
    await prisma.account.create({
      data: {
        id,
        name: `テストユーザー-${id}`,
        email: `test-${id}@example.com`,
        passwordHash: 'hashed',
        createdAt: new Date(),
      },
    });
    return id;
  }

  async function テストコミュニティを作成する(accountId: AccountId): Promise<CommunityId> {
    const id = createCommunityId();
    await prisma.community.create({
      data: {
        id,
        name: `テストコミュニティ-${id}`,
        description: 'テスト',
        category: 'TECH',
        visibility: 'PUBLIC',
      },
    });
    await prisma.communityMember.create({
      data: {
        id: `member-${id}`,
        communityId: id,
        accountId,
        role: 'OWNER',
        status: 'ACTIVE',
        createdAt: new Date(),
      },
    });
    return id;
  }

  async function テストイベントを作成する(
    communityId: CommunityId,
    accountId: AccountId,
    status: keyof typeof EventStatus = EventStatus.DRAFT
  ): Promise<EventId> {
    const id = createEventId();
    const now = new Date();
    await prisma.event.create({
      data: {
        id,
        communityId,
        createdBy: accountId,
        title: `テストイベント-${id}`,
        description: null,
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        format: 'ONLINE',
        capacity: 50,
        status,
        createdAt: now,
        updatedAt: now,
      },
    });
    return id;
  }

  describe('findById', () => {
    it('存在するイベントIDに対してイベントを返すこと', async () => {
      const accountId = await テストアカウントを作成する();
      const communityId = await テストコミュニティを作成する(accountId);
      const eventId = await テストイベントを作成する(communityId, accountId);

      const event = await repository.findById(eventId);

      expect(event).not.toBeNull();
      expect(event?.id).toBe(eventId);
      expect(event?.communityId).toBe(communityId);
      expect(event?.status).toBe('DRAFT');
    });

    it('存在しないIDに対してnullを返すこと', async () => {
      const event = await repository.findById(createEventId());
      expect(event).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('指定したステータスのイベントのみ返すこと', async () => {
      const accountId = await テストアカウントを作成する();
      const communityId = await テストコミュニティを作成する(accountId);
      await テストイベントを作成する(communityId, accountId, 'DRAFT');
      await テストイベントを作成する(communityId, accountId, 'PUBLISHED');

      const drafts = await repository.findByStatus('DRAFT');
      expect(drafts.length).toBe(1);
      expect(drafts[0].status).toBe('DRAFT');

      const published = await repository.findByStatus('PUBLISHED');
      expect(published.length).toBe(1);
      expect(published[0].status).toBe('PUBLISHED');
    });
  });

  describe('findUpcoming', () => {
    it('指定期間内の PUBLISHED イベントを返すこと', async () => {
      const accountId = await テストアカウントを作成する();
      const communityId = await テストコミュニティを作成する(accountId);
      await テストイベントを作成する(communityId, accountId, 'PUBLISHED');

      const from = new Date();
      const to = new Date(Date.now() + 200000000);
      const events = await repository.findUpcoming(from, to);

      expect(events.length).toBe(1);
      expect(events[0].status).toBe('PUBLISHED');
    });

    it('期間外のイベントは含まれないこと', async () => {
      const accountId = await テストアカウントを作成する();
      const communityId = await テストコミュニティを作成する(accountId);
      await テストイベントを作成する(communityId, accountId, 'PUBLISHED');

      const from = new Date(Date.now() + 200000000);
      const to = new Date(Date.now() + 400000000);
      const events = await repository.findUpcoming(from, to);

      expect(events.length).toBe(0);
    });

    it('DRAFT ステータスのイベントは含まれないこと', async () => {
      const accountId = await テストアカウントを作成する();
      const communityId = await テストコミュニティを作成する(accountId);
      await テストイベントを作成する(communityId, accountId, 'DRAFT');

      const from = new Date();
      const to = new Date(Date.now() + 200000000);
      const events = await repository.findUpcoming(from, to);

      expect(events.length).toBe(0);
    });
  });
});
