import { describe, it, expect } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { ParticipationRepository } from '@participation/repositories/participation.repository';
import type { CheckInRepository } from '../../repositories/checkin.repository';
import { createCheckInCommand } from '../commands/check-in.command';
import { createListCheckInsQuery } from '../queries/list-checkins.query';

// ============================================================
// CheckIn UseCase - 不正 ID フォーマット時の Result.err 検証
// ============================================================

const notCalled = (): never => {
  throw new Error('repository should not be called on InvalidIdFormat');
};

const participationRepositoryStub: ParticipationRepository = {
  findByEventAndAccount: notCalled,
} as unknown as ParticipationRepository;

const checkInRepositoryStub: CheckInRepository = {
  findByParticipationId: notCalled,
  save: notCalled,
  findByEvent: notCalled,
} as unknown as CheckInRepository;

const prismaStub = {} as PrismaClient;

describe('createCheckInCommand - InvalidIdFormat', () => {
  const command = createCheckInCommand(participationRepositoryStub, checkInRepositoryStub);

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

describe('createListCheckInsQuery - InvalidIdFormat', () => {
  const query = createListCheckInsQuery(prismaStub, checkInRepositoryStub);

  it('eventId が UUID でない場合は InvalidIdFormat を返す', async () => {
    const result = await query({
      eventId: 'bad',
      requesterId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('InvalidIdFormat');
  });

  it('requesterId が UUID でない場合は InvalidIdFormat を返す', async () => {
    const result = await query({
      eventId: '550e8400-e29b-41d4-a716-446655440000',
      requesterId: 'bad',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('InvalidIdFormat');
  });
});
