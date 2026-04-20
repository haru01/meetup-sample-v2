import { ok, err, type Result } from '@shared/result';
import type { InMemoryEventBus } from '@shared/event-bus';
import type { AccountId, CommunityId, EventId } from '@shared/schemas/common';
import { publishEvent, type Event } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';
import type {
  EventDomainEvent,
  EventPublishedEvent,
  PublishEventError,
} from '../../errors/event-errors';

export interface PublishEventInput {
  readonly communityId: CommunityId;
  readonly eventId: EventId;
  readonly publishedBy: AccountId;
  readonly occurredAt: Date;
}

export type PublishEventCommand = (
  input: PublishEventInput
) => Promise<Result<Event, PublishEventError>>;

export function createPublishEventCommand(
  eventRepository: EventRepository,
  eventBus: InMemoryEventBus<EventDomainEvent>
): PublishEventCommand {
  return async ({ communityId, eventId, publishedBy, occurredAt }) => {
    const event = await eventRepository.findById(eventId);
    // 存在しない、または URL の communityId と不一致な場合は EventNotFound を返す。
    // 不一致時も 404 相当に揃え、他コミュニティの eventId 存在を推測させない（IDOR 対策）
    if (!event || event.communityId !== communityId) {
      return err({ type: 'EventNotFound' });
    }

    const publishResult = publishEvent(event, occurredAt);
    if (!publishResult.ok) return publishResult;

    await eventRepository.save(publishResult.value);

    const domainEvent: EventPublishedEvent = {
      type: 'EventPublished',
      eventId: publishResult.value.id,
      communityId: publishResult.value.communityId,
      publishedBy,
      occurredAt,
    };
    await eventBus.publish(domainEvent);

    return ok(publishResult.value);
  };
}
