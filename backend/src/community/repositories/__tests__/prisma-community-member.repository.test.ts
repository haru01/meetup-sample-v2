import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaCommunityMemberRepository } from '../prisma-community-member.repository';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearMeetupTables,
} from '../../../infrastructure/test-helper';
import type { PrismaClient } from '@prisma/client';
import {
  createAccountId,
  createCommunityId,
  createCommunityMemberId,
} from '@shared/schemas/id-factories';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import { CommunityMemberRole, CommunityMemberStatus } from '../../models/schemas/member.schema';

// ============================================================
// PrismaCommunityMemberRepository 統合テスト
// ============================================================

describe('PrismaCommunityMemberRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaCommunityMemberRepository;

  beforeAll(() => {
    prisma = createTestPrismaClient();
    repository = new PrismaCommunityMemberRepository(prisma);
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

  async function テストコミュニティを作成する(): Promise<CommunityId> {
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
    return id;
  }

  async function テストメンバーを作成する(
    communityId: CommunityId,
    accountId: AccountId,
    role: keyof typeof CommunityMemberRole = CommunityMemberRole.MEMBER,
    status: keyof typeof CommunityMemberStatus = CommunityMemberStatus.ACTIVE
  ): Promise<CommunityMemberId> {
    const id = createCommunityMemberId();
    await prisma.communityMember.create({
      data: { id, communityId, accountId, role, status, createdAt: new Date() },
    });
    return id;
  }

  describe('findByCommunityId', () => {
    it('ACTIVE メンバーの一覧と件数を返すこと', async () => {
      const communityId = await テストコミュニティを作成する();
      const account1 = await テストアカウントを作成する();
      const account2 = await テストアカウントを作成する();
      const account3 = await テストアカウントを作成する();

      await テストメンバーを作成する(communityId, account1, 'OWNER', 'ACTIVE');
      await テストメンバーを作成する(communityId, account2, 'MEMBER', 'ACTIVE');
      await テストメンバーを作成する(communityId, account3, 'MEMBER', 'PENDING');

      const result = await repository.findByCommunityId(communityId, { limit: 10, offset: 0 });

      expect(result.total).toBe(2);
      expect(result.members.length).toBe(2);
      expect(result.members.every((m) => m.status === 'ACTIVE')).toBe(true);
    });

    it('limit/offset によるページネーションが機能すること', async () => {
      const communityId = await テストコミュニティを作成する();
      const accounts = await Promise.all([
        テストアカウントを作成する(),
        テストアカウントを作成する(),
        テストアカウントを作成する(),
      ]);
      for (const accountId of accounts) {
        await テストメンバーを作成する(communityId, accountId, 'MEMBER', 'ACTIVE');
      }

      const page1 = await repository.findByCommunityId(communityId, { limit: 2, offset: 0 });
      expect(page1.members.length).toBe(2);
      expect(page1.total).toBe(3);

      const page2 = await repository.findByCommunityId(communityId, { limit: 2, offset: 2 });
      expect(page2.members.length).toBe(1);
      expect(page2.total).toBe(3);
    });
  });
});
