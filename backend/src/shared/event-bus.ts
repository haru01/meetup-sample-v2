// ============================================================
// InMemory Event Bus - Cross-context communication via domain events
// ============================================================

/**
 * ドメインイベントの基底型
 * type フィールドを持つ discriminated union として定義する
 */
export type DomainEvent = {
  readonly type: string;
};

/**
 * イベントハンドラー型
 */
type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;

/**
 * サブスクリプション解除関数
 */
type Unsubscribe = () => void;

/**
 * インメモリイベントバス
 *
 * subscribe/publish 機構を提供する。
 * モジュラーモノリス内でのコンテキスト間連携に使用。
 */
export class InMemoryEventBus<TEvent extends DomainEvent = DomainEvent> {
  private readonly handlers: Map<string, EventHandler[]> = new Map();

  /**
   * イベントハンドラーを登録する
   *
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   * @returns 登録解除関数
   */
  subscribe<T extends TEvent['type']>(
    eventType: T,
    handler: EventHandler<Extract<TEvent, { type: T }>>
  ): Unsubscribe {
    const existing = this.handlers.get(eventType) ?? [];
    const newHandlers = [...existing, handler as EventHandler];
    this.handlers.set(eventType, newHandlers);

    return () => {
      const current = this.handlers.get(eventType) ?? [];
      this.handlers.set(
        eventType,
        current.filter((h) => h !== (handler as EventHandler))
      );
    };
  }

  /**
   * イベントを発行する
   *
   * 登録されたハンドラーに順次配信し、すべてのハンドラーの完了を待つ。
   *
   * @param event - 発行するイベント
   */
  async publish(event: TEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];

    for (const handler of handlers) {
      await handler(event);
    }
  }
}
