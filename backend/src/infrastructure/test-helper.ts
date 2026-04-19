import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

// ============================================================
// テスト用 PrismaClient ヘルパー
// ============================================================

/**
 * テスト用の独立した SQLite DB を持つ PrismaClient を作成する。
 * 各テストスイートで独立したファイルを使用することで並列実行を安全にする。
 */
export function createTestPrismaClient(): PrismaClient {
  const dbPath = path.join(os.tmpdir(), `test-${randomUUID()}.db`);
  const url = `file:${dbPath}`;

  // スキーマをプッシュ（マイグレーション適用）
  spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: path.resolve(process.cwd()),
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });

  return new PrismaClient({
    datasources: {
      db: { url },
    },
  });
}

/**
 * テスト終了時にPrismaClientを切断する
 */
export async function cleanupTestPrismaClient(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
}

/**
 * 認証コンテキストのテーブルをクリア
 */
export async function clearAuthTables(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([prisma.communityMember.deleteMany(), prisma.account.deleteMany()]);
}

/**
 * Meetup コンテキストのテーブルをクリア（認証テーブルも含む）
 */
export async function clearMeetupTables(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.event.deleteMany(),
    prisma.communityMember.deleteMany(),
    prisma.community.deleteMany(),
    prisma.account.deleteMany(),
  ]);
}
