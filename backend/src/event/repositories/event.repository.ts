import type { Event } from '../models/event';
import type { EventStatus } from '../models/schemas/event.schema';
import type { EventId } from '@shared/schemas/common';

// ============================================================
// EventRepository インターフェース
// ============================================================

export interface EventRepository {
  findById(id: EventId): Promise<Event | null>;
  findByStatus(status: EventStatus): Promise<Event[]>;
  findUpcoming(from: Date, to: Date): Promise<Event[]>;
  save(event: Event): Promise<void>;
}
