import type { Event } from '../models/event';
import type { EventId } from '@shared/schemas/common';

// ============================================================
// EventRepository インターフェース
// ============================================================

export interface EventRepository {
  /**
   * イベントを保存（upsert）
   */
  save(event: Event): Promise<void>;

  /**
   * IDでイベントを取得
   */
  findById(id: EventId): Promise<Event | null>;
}
