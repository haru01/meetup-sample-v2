import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCreateEventCommand } from '../create-event.command';
import type { CreateEventInput } from '../create-event.command';
import type { CommunityRepository } from '../../../repositories/community.repository';
import type { EventRepository } from '../../../repositories/event.repository';
import { createEventId, createCommunityId, createAccountId } from '@shared/schemas/id-factories';

const now = new Date('2026-01-01T00:00:00Z');

const makeCommand = (): CreateEventInput => ({
  id: createEventId('event-1'),
  communityId: createCommunityId('community-1'),
  createdBy: createAccountId('account-1'),
  title: 'テストイベント',
  description: 'テスト用の説明',
  startsAt: new Date('2026-06-01T10:00:00Z'),
  endsAt: new Date('2026-06-01T12:00:00Z'),
  format: 'ONLINE' as const,
  capacity: 50,
  now,
  createdAt: now,
  updatedAt: now,
});

const makeCommunityRepository = (): CommunityRepository => ({
  findById: vi.fn().mockResolvedValue({
    id: createCommunityId('community-1'),
    name: 'テストコミュニティ',
    description: null,
    category: 'TECH' as const,
    visibility: 'PUBLIC' as const,
    createdAt: now,
    updatedAt: now,
  }),
  findByName: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  findAll: vi.fn().mockResolvedValue({ communities: [], total: 0 }),
  countByOwnerAccountId: vi.fn().mockResolvedValue(0),
});

const makeEventRepository = (): EventRepository => ({
  save: vi.fn().mockResolvedValue(undefined),
  findById: vi.fn().mockResolvedValue(null),
});

describe('CreateEventCommand', () => {
  let communityRepo: CommunityRepository;
  let eventRepo: EventRepository;
  let useCase: ReturnType<typeof createCreateEventCommand>;

  beforeEach(() => {
    communityRepo = makeCommunityRepository();
    eventRepo = makeEventRepository();
    useCase = createCreateEventCommand(communityRepo, eventRepo);
  });

  describe('正常系', () => {
    it('イベントを作成し保存する', async () => {
      const cmd = makeCommand();
      const result = await useCase(cmd);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(cmd.id);
        expect(result.value.title).toBe('テストイベント');
        expect(result.value.status).toBe('DRAFT');
        expect(result.value.communityId).toBe(cmd.communityId);
      }
    });

    it('イベントをリポジトリに保存する', async () => {
      const cmd = makeCommand();
      await useCase(cmd);
      expect(eventRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('異常系', () => {
    it('コミュニティが存在しない場合は CommunityNotFound エラーを返す', async () => {
      const cmd = makeCommand();
      vi.mocked(communityRepo.findById).mockResolvedValue(null);
      const result = await useCase(cmd);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('CommunityNotFound');
      }
    });

    it('開始日時が過去の場合は EventDateInPast エラーを返す', async () => {
      const cmd = { ...makeCommand(), startsAt: new Date('2025-01-01T00:00:00Z') };
      const result = await useCase(cmd);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventDateInPast');
      }
    });

    it('終了日時が開始日時以前の場合は EventEndBeforeStart エラーを返す', async () => {
      const cmd = { ...makeCommand(), endsAt: new Date('2026-06-01T09:00:00Z') };
      const result = await useCase(cmd);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('EventEndBeforeStart');
      }
    });
  });
});
