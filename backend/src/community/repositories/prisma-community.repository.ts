import type { PrismaClient } from '@prisma/client';
import type { Community } from '../models/community';
import type { AccountId, CommunityId } from '@shared/schemas/common';
import { CommunityMemberRole, CommunityMemberStatus } from '../models/schemas/member.schema';
import type { CommunityRepository } from './community.repository';

// ============================================================
// Prisma を使用した CommunityRepository 実装
// ============================================================

type CommunityRecord = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  visibility: string;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaCommunityRepository implements CommunityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: CommunityId): Promise<Community | null> {
    const record = await this.prisma.community.findUnique({ where: { id } });
    return record ? this.toCommunity(record) : null;
  }

  async findByName(name: string): Promise<Community | null> {
    const record = await this.prisma.community.findUnique({ where: { name } });
    return record ? this.toCommunity(record) : null;
  }

  async save(community: Community): Promise<void> {
    await this.prisma.community.upsert({
      where: { id: community.id },
      create: {
        id: community.id,
        name: community.name,
        description: community.description,
        category: community.category,
        visibility: community.visibility,
        createdAt: community.createdAt,
        updatedAt: community.updatedAt,
      },
      update: {
        name: community.name,
        description: community.description,
        category: community.category,
        visibility: community.visibility,
        updatedAt: community.updatedAt,
      },
    });
  }

  async findAll(options: {
    category?: string;
    memberAccountId?: AccountId;
    limit: number;
    offset: number;
  }): Promise<{ communities: Community[]; total: number }> {
    const where = this.buildFindAllWhere(options);

    const [records, total] = await this.prisma.$transaction([
      this.prisma.community.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.limit,
        skip: options.offset,
      }),
      this.prisma.community.count({ where }),
    ]);

    return {
      communities: records.map((r) => this.toCommunity(r)),
      total,
    };
  }

  async countByOwnerAccountId(accountId: AccountId): Promise<number> {
    return this.prisma.communityMember.count({
      where: {
        accountId,
        role: CommunityMemberRole.OWNER,
      },
    });
  }

  private buildFindAllWhere(options: {
    category?: string;
    memberAccountId?: AccountId;
  }): Record<string, unknown> {
    const conditions: Record<string, unknown> = {};

    if (options.category !== undefined) {
      conditions['category'] = options.category;
    }

    if (options.memberAccountId !== undefined) {
      conditions['members'] = {
        some: {
          accountId: options.memberAccountId,
          status: CommunityMemberStatus.ACTIVE,
        },
      };
    }

    return conditions;
  }

  private toCommunity(record: CommunityRecord): Community {
    return {
      id: record.id as CommunityId,
      name: record.name,
      description: record.description,
      category: record.category as Community['category'],
      visibility: record.visibility as Community['visibility'],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
