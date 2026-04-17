import type { Event } from '../../models/event';
import type { EventRepository } from '../../repositories/event.repository';

// ============================================================
// 公開済みイベント一覧取得クエリ
// ============================================================

export type ListPublishedEventsQuery = () => Promise<Event[]>;

export function createListPublishedEventsQuery(
  eventRepository: EventRepository
): ListPublishedEventsQuery {
  return async () => {
    return eventRepository.findByStatus('PUBLISHED');
  };
}
