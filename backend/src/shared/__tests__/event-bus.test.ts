import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryEventBus } from '../event-bus';

// テスト用イベント型
type UserCreatedEvent = {
  readonly type: 'UserCreated';
  readonly payload: { readonly userId: string; readonly name: string };
};

type OrderPlacedEvent = {
  readonly type: 'OrderPlaced';
  readonly payload: { readonly orderId: string; readonly amount: number };
};

type TestDomainEvent = UserCreatedEvent | OrderPlacedEvent;

describe('InMemoryEventBus', () => {
  let eventBus: InMemoryEventBus<TestDomainEvent>;

  beforeEach(() => {
    eventBus = new InMemoryEventBus<TestDomainEvent>();
  });

  describe('subscribe と publish', () => {
    it('登録したハンドラーがイベント発行時に呼ばれる', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      eventBus.subscribe('UserCreated', handler);

      const event: UserCreatedEvent = {
        type: 'UserCreated',
        payload: { userId: 'u1', name: 'Alice' },
      };

      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('異なるイベントタイプのハンドラーは呼ばれない', async () => {
      const userHandler = vi.fn().mockResolvedValue(undefined);
      const orderHandler = vi.fn().mockResolvedValue(undefined);

      eventBus.subscribe('UserCreated', userHandler);
      eventBus.subscribe('OrderPlaced', orderHandler);

      const event: UserCreatedEvent = {
        type: 'UserCreated',
        payload: { userId: 'u1', name: 'Alice' },
      };

      await eventBus.publish(event);

      expect(userHandler).toHaveBeenCalledOnce();
      expect(orderHandler).not.toHaveBeenCalled();
    });

    it('ハンドラーが登録されていない場合にエラーが発生しない', async () => {
      const event: OrderPlacedEvent = {
        type: 'OrderPlaced',
        payload: { orderId: 'o1', amount: 100 },
      };

      await expect(eventBus.publish(event)).resolves.toBeUndefined();
    });
  });

  describe('複数サブスクライバー', () => {
    it('同じイベントタイプに複数のハンドラーが登録できる', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);
      const handler3 = vi.fn().mockResolvedValue(undefined);

      eventBus.subscribe('UserCreated', handler1);
      eventBus.subscribe('UserCreated', handler2);
      eventBus.subscribe('UserCreated', handler3);

      const event: UserCreatedEvent = {
        type: 'UserCreated',
        payload: { userId: 'u1', name: 'Alice' },
      };

      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
      expect(handler3).toHaveBeenCalledOnce();
    });

    it('複数ハンドラーが登録順に実行される', async () => {
      const order: string[] = [];

      const handler1 = vi.fn().mockImplementation(async () => {
        order.push('handler1');
      });
      const handler2 = vi.fn().mockImplementation(async () => {
        order.push('handler2');
      });

      eventBus.subscribe('UserCreated', handler1);
      eventBus.subscribe('UserCreated', handler2);

      await eventBus.publish({ type: 'UserCreated', payload: { userId: 'u1', name: 'Bob' } });

      expect(order).toEqual(['handler1', 'handler2']);
    });
  });

  describe('非同期ハンドラー', () => {
    it('Promiseを返す非同期ハンドラーが正しく完了する', async () => {
      let resolved = false;

      const asyncHandler = vi.fn().mockImplementation(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
        resolved = true;
      });

      eventBus.subscribe('OrderPlaced', asyncHandler);

      await eventBus.publish({
        type: 'OrderPlaced',
        payload: { orderId: 'o1', amount: 500 },
      });

      expect(resolved).toBe(true);
      expect(asyncHandler).toHaveBeenCalledOnce();
    });

    it('複数の非同期ハンドラーがすべて完了してからpublishが解決する', async () => {
      const results: string[] = [];

      eventBus.subscribe('UserCreated', async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
        results.push('first');
      });

      eventBus.subscribe('UserCreated', async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        results.push('second');
      });

      await eventBus.publish({ type: 'UserCreated', payload: { userId: 'u2', name: 'Carol' } });

      expect(results).toHaveLength(2);
      expect(results).toContain('first');
      expect(results).toContain('second');
    });
  });

  describe('unsubscribe', () => {
    it('登録解除したハンドラーはイベント発行時に呼ばれない', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);

      const unsubscribe = eventBus.subscribe('UserCreated', handler);

      unsubscribe();

      await eventBus.publish({ type: 'UserCreated', payload: { userId: 'u1', name: 'Dave' } });

      expect(handler).not.toHaveBeenCalled();
    });

    it('一方のハンドラーを解除しても他のハンドラーは引き続き呼ばれる', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      const unsubscribe1 = eventBus.subscribe('UserCreated', handler1);
      eventBus.subscribe('UserCreated', handler2);

      unsubscribe1();

      await eventBus.publish({ type: 'UserCreated', payload: { userId: 'u1', name: 'Eve' } });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it('unsubscribeを複数回呼んでもエラーが発生しない', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const unsubscribe = eventBus.subscribe('UserCreated', handler);

      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
