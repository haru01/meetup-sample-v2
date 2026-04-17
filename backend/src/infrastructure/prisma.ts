// ============================================================
// Prisma Client - Singleton instance
// ============================================================

import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient instance.
 * Prevents multiple connections during hot reload in development.
 */
export const prisma = globalThis.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

/**
 * For testing: disconnect from the database
 */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * For testing: clear all tables
 */
export async function clearDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.communityMember.deleteMany(),
    prisma.community.deleteMany(),
    prisma.account.deleteMany(),
  ]);
}
