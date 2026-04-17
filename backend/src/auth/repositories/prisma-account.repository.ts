import type { PrismaClient } from '@prisma/client';
import type { Account } from '../models/account';
import type { AccountId } from '@shared/schemas/common';
import type { AccountRepository } from './account.repository';

// ============================================================
// Prisma アカウントリポジトリ実装
// ============================================================

/**
 * Prismaを使用したアカウントリポジトリ実装
 */
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<Account | null> {
    const record = await this.prisma.account.findUnique({
      where: { email },
    });

    return record ? this.toAccount(record) : null;
  }

  async findById(id: AccountId): Promise<Account | null> {
    const record = await this.prisma.account.findUnique({
      where: { id },
    });

    return record ? this.toAccount(record) : null;
  }

  async save(account: Account): Promise<void> {
    await this.prisma.account.upsert({
      where: { id: account.id },
      create: {
        id: account.id,
        name: account.name,
        email: account.email,
        passwordHash: account.passwordHash,
        createdAt: account.createdAt,
      },
      update: {
        name: account.name,
        email: account.email,
        passwordHash: account.passwordHash,
      },
    });
  }

  private toAccount(record: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
  }): Account {
    return {
      id: record.id as AccountId,
      name: record.name,
      email: record.email,
      passwordHash: record.passwordHash,
      createdAt: record.createdAt,
    };
  }
}
