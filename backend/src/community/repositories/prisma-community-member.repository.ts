import type { PrismaClient } from '@prisma/client';
import type { CommunityMember } from '../models/community-member';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import { CommunityMemberStatus } from '../models/schemas/member.schema';
import type { CommunityMemberRepository } from './community-member.repository';

// ============================================================
// Prisma を使用した CommunityMemberRepository 実装
// ============================================================

type CommunityMemberRecord = {
  id: string;
  communityId: string;
  accountId: string;
  role: string;
  status: string;
  createdAt: Date;
};

export class PrismaCommunityMemberRepository implements CommunityMemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByIds(communityId: CommunityId, accountId: AccountId): Promise<CommunityMember | null> {
    const record = await this.prisma.communityMember.findUnique({
      where: { communityId_accountId: { communityId, accountId } },
    });
    return record ? this.toCommunityMember(record) : null;
  }

  async findById(id: CommunityMemberId): Promise<CommunityMember | null> {
    const record = await this.prisma.communityMember.findUnique({ where: { id } });
    return record ? this.toCommunityMember(record) : null;
  }

  async save(member: CommunityMember): Promise<void> {
    await this.prisma.communityMember.upsert({
      where: { id: member.id },
      create: {
        id: member.id,
        communityId: member.communityId,
        accountId: member.accountId,
        role: member.role,
        status: member.status,
        createdAt: member.createdAt,
      },
      update: {
        role: member.role,
        status: member.status,
      },
    });
  }

  async delete(id: CommunityMemberId): Promise<void> {
    await this.prisma.communityMember.delete({ where: { id } });
  }

  async findByCommunityId(
    communityId: CommunityId,
    options: { limit: number; offset: number }
  ): Promise<{ members: CommunityMember[]; total: number }> {
    const where = {
      communityId,
      status: CommunityMemberStatus.ACTIVE,
    };

    const [records, total] = await this.prisma.$transaction([
      this.prisma.communityMember.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.communityMember.count({ where }),
    ]);

    return {
      members: records.map((r) => this.toCommunityMember(r)),
      total,
    };
  }

  private toCommunityMember(record: CommunityMemberRecord): CommunityMember {
    return {
      id: record.id as CommunityMemberId,
      communityId: record.communityId as CommunityId,
      accountId: record.accountId as AccountId,
      role: record.role as CommunityMember['role'],
      status: record.status as CommunityMember['status'],
      createdAt: record.createdAt,
    };
  }
}
