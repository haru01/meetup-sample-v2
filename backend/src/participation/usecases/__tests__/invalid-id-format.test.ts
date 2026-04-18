import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { InMemoryEventBus } from '@shared/event-bus';
import type { MeetupDomainEvent } from '@shared/domain-events';
import type { EventRepository } from '@event/repositories/event.repository';
import type { ParticipationRepository } from '../../repositories/participation.repository';
import { createApplyForEventCommand } from '../commands/apply-for-event.command';
import { createApproveParticipationsCommand } from '../commands/approve-participations.command';
import { createGetRemainingCapacityQuery } from '../queries/get-remaining-capacity.query';

// ============================================================
// Participation UseCase - 不正 ID フォーマット時の Result.err 検証
// ============================================================
// UseCase は Result<T, E> 規約を守るため、入力 ID が UUID でない場合も
// throw せず Result.err({ type: 'InvalidIdFormat' }) を返すこと。

const notCalled = (): never => {
  throw new Error('repository should not be called on InvalidIdFormat');
};

const eventRepositoryStub: EventRepository = {
  findById: notCalled,
  save: notCalled,
  findByCommunityId: notCalled,
  findPublishedBetween: notCalled,
} as unknown as EventRepository;

const participationRepositoryStub: ParticipationRepository = {
  findByEventAndAccount: notCalled,
  applyWithCapacityCheck: notCalled,
  findAppliedByEvent: notCalled,
  findById: notCalled,
  saveAll: notCalled,
  findByEventId: notCalled,
  findByAccountId: notCalled,
  countApproved: notCalled,
  save: notCalled,
} as unknown as ParticipationRepository;

const prismaStub = {} as PrismaClient;

describe('createApplyForEventCommand - InvalidIdFormat', () => {
  const eventBus = new InMemoryEventBus<MeetupDomainEvent>();
  const command = createApplyForEventCommand(
    eventRepositoryStub,
    participationRepositoryStub,
    eventBus
  );

  it('eventId が UUID でない場合は InvalidIdFormat を返す', async () => {
    const result = await command({
      eventId: 'not-a-uuid',
      accountId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('InvalidIdFormat');
    }
  });

  it('accountId が UUID でない場合は InvalidIdFormat を返す', async () => {
    const result = await command({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      accountId: 'not-a-uuid',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('InvalidIdFormat');
    }
  });
});

describe('createApproveParticipationsCommand - InvalidIdFormat', () => {
  const eventBus = new InMemoryEventBus<MeetupDomainEvent>();
  const command = createApproveParticipationsCommand(
    eventRepositoryStub,
    participationRepositoryStub,
    eventBus
  );

  it('eventId が UUID でない場合は InvalidIdFormat を返す', async () => {
    const result = await command({
      eventId: 'bad',
      requesterId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('InvalidIdFormat');
  });

  it('requesterId が UUID でない場合は InvalidIdFormat を返す', async () => {
    const result = await command({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      requesterId: 'bad',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('InvalidIdFormat');
  });
});

describe('createGetRemainingCapacityQuery - InvalidIdFormat', () => {
  const query = createGetRemainingCapacityQuery(prismaStub, participationRepositoryStub);

  it('eventId が UUID でない場合は InvalidIdFormat を返す', async () => {
    const result = await query('bad');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('InvalidIdFormat');
  });
});
