import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearMeetupTables,
} from '@/infrastructure/test-helper';
import { createEventDependencies } from '../composition';
import { createEventId } from '@shared/schemas/id-factories';

// ============================================================
// Event context composition - 通知ポリシーのバッチ処理テスト
// ============================================================
// findMany のチャンク化と createMany によるバッチ insert が、
// 参加者が大量に存在しても全件保存できることを検証する。

describe('Event 通知ポリシーのチャンク/バッチ処理', () => {
  let prisma: PrismaClient;
  let eventBus: InMemoryEventBus<MeetupDomainEvent>;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  beforeEach(async () => {
    await clearMeetupTables(prisma);
    eventBus = new InMemoryEventBus<MeetupDomainEvent>();
    createEventDependencies(prisma, eventBus);
  });

  afterAll(async () => {
    await cleanupTestPrismaClient(prisma);
  });

  async function 大量の承認済み参加者が紐付くイベントを用意する(
    participantCount: number
  ): Promise<string> {
    const uniq = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const owner = await prisma.account.create({
      data: {
        name: 'オーナー',
        email: `owner-${uniq}@example.com`,
        passwordHash: 'hashed',
      },
    });
    const community = await prisma.community.create({
      data: {
        name: `コミュニティ-${uniq}`,
        description: 'バッチテスト用',
        category: 'TECH',
        visibility: 'PUBLIC',
      },
    });
    const event = await prisma.event.create({
      data: {
        communityId: community.id,
        createdBy: owner.id,
        title: 'バッチテスト対象イベント',
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        format: 'ONLINE',
        capacity: participantCount,
        status: 'PUBLISHED',
      },
    });

    const accounts = Array.from({ length: participantCount }, (_, i) => ({
      name: `参加者${i}`,
      email: `user-${uniq}-${i}@example.com`,
      passwordHash: 'hashed',
    }));
    await prisma.account.createMany({ data: accounts });
    const created = await prisma.account.findMany({
      where: { email: { startsWith: `user-${uniq}-` } },
      select: { id: true },
    });
    await prisma.participation.createMany({
      data: created.map((a) => ({
        eventId: event.id,
        accountId: a.id,
        status: 'APPROVED' as const,
      })),
    });
    return event.id;
  }

  it('EventClosed を発火すると 500 人分の SURVEY 通知がすべて保存されること', async () => {
    const eventId = await 大量の承認済み参加者が紐付くイベントを用意する(500);

    await eventBus.publish({ type: 'EventClosed', eventId: createEventId(eventId) });

    const notifications = await prisma.notification.findMany({
      where: { type: 'SURVEY' },
      select: { recipientId: true },
    });
    expect(notifications).toHaveLength(500);
    const unique = new Set(notifications.map((n) => n.recipientId));
    expect(unique.size).toBe(500);
  });

  it('EventCancelled を発火すると APPROVED + WAITLISTED 全員に EVENT_CANCELLED 通知が保存されること', async () => {
    const eventId = await 大量の承認済み参加者が紐付くイベントを用意する(250);
    // 追加で WAITLISTED を 50 人分作成
    const uniq = `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const waitlisted = Array.from({ length: 50 }, (_, i) => ({
      name: `補欠${i}`,
      email: `wl-${uniq}-${i}@example.com`,
      passwordHash: 'hashed',
    }));
    await prisma.account.createMany({ data: waitlisted });
    const wlAccounts = await prisma.account.findMany({
      where: { email: { startsWith: `wl-${uniq}-` } },
      select: { id: true },
    });
    await prisma.participation.createMany({
      data: wlAccounts.map((a) => ({
        eventId,
        accountId: a.id,
        status: 'WAITLISTED' as const,
      })),
    });

    await eventBus.publish({ type: 'EventCancelled', eventId: createEventId(eventId) });

    const notifications = await prisma.notification.findMany({
      where: { type: 'EVENT_CANCELLED' },
    });
    expect(notifications).toHaveLength(300);
  });

  it('EventDateApproached を発火すると APPROVED 参加者全員に REMINDER 通知が保存されること', async () => {
    const eventId = await 大量の承認済み参加者が紐付くイベントを用意する(300);

    await eventBus.publish({ type: 'EventDateApproached', eventId: createEventId(eventId) });

    const notifications = await prisma.notification.findMany({
      where: { type: 'REMINDER' },
    });
    expect(notifications).toHaveLength(300);
  });
});
