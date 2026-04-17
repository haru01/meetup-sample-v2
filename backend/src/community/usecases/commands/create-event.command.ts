import { ok, err, type Result } from '@shared/result';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';
import type { Event } from '../../models/event';
import { createEvent } from '../../models/event';
import type {
  EventTitle,
  EventDescription,
  EventFormat,
  EventCapacity,
} from '../../models/schemas/event.schema';
import type { CommunityRepository } from '../../repositories/community.repository';
import type { EventRepository } from '../../repositories/event.repository';
import type { CreateEventError } from '../../errors/event-errors';

// ============================================================
// イベント作成コマンド
// ============================================================

export interface CreateEventInput {
  readonly id: EventId;
  readonly communityId: CommunityId;
  readonly createdBy: AccountId;
  readonly title: EventTitle;
  readonly description: EventDescription;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly format: EventFormat;
  readonly capacity: EventCapacity;
  readonly now: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ============================================================
// イベント作成ユースケース
// ============================================================

/**
 * イベント作成ユースケース
 *
 * コミュニティ存在チェック後、ファクトリでイベントを生成し保存する。
 * 権限チェックはミドルウェアで実施済みのため、ここでは行わない。
 */
export type CreateEventCommand = (
  command: CreateEventInput
) => Promise<Result<Event, CreateEventError>>;

export function createCreateEventCommand(
  communityRepository: CommunityRepository,
  eventRepository: EventRepository
): CreateEventCommand {
  return async (command) => {
    // コミュニティ存在チェック
    const community = await communityRepository.findById(command.communityId);
    if (!community) {
      return err({ type: 'CommunityNotFound' });
    }

    // ファクトリでイベント生成（日時バリデーション含む）
    const createResult = createEvent({
      id: command.id,
      communityId: command.communityId,
      createdBy: command.createdBy,
      title: command.title,
      description: command.description,
      startsAt: command.startsAt,
      endsAt: command.endsAt,
      format: command.format,
      capacity: command.capacity,
      now: command.now,
      createdAt: command.createdAt,
      updatedAt: command.updatedAt,
    });

    if (!createResult.ok) return createResult;
    const event = createResult.value;

    // リポジトリに保存
    await eventRepository.save(event);

    return ok(event);
  };
}
