import { describe, it, expect } from 'vitest';
import { createEvent } from '../event';
import { createEventId, createCommunityId, createAccountId } from '@shared/schemas/id-factories';

describe('createEvent', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const futureStart = new Date('2026-06-01T10:00:00Z');
  const futureEnd = new Date('2026-06-01T12:00:00Z');

  const baseInput = {
    id: createEventId(),
    communityId: createCommunityId(),
    createdBy: createAccountId(),
    title: 'テストイベント',
    description: 'テスト用の説明',
    startsAt: futureStart,
    endsAt: futureEnd,
    format: 'ONLINE' as const,
    capacity: 50,
    now,
    createdAt: now,
    updatedAt: now,
  };

  it('有効な入力でイベントを作成できる', () => {
    const result = createEvent(baseInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe(baseInput.id);
    expect(result.value.title).toBe('テストイベント');
    expect(result.value.status).toBe('DRAFT');
    expect(result.value.communityId).toBe(baseInput.communityId);
    expect(result.value.createdBy).toBe(baseInput.createdBy);
  });

  it('開始日時が現在時刻以前の場合は EventDateInPast エラーを返す', () => {
    const input = { ...baseInput, startsAt: new Date('2025-01-01T00:00:00Z') };
    const result = createEvent(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('EventDateInPast');
  });

  it('終了日時が開始日時以前の場合は EventEndBeforeStart エラーを返す', () => {
    const input = { ...baseInput, endsAt: new Date('2026-06-01T09:00:00Z') };
    const result = createEvent(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('EventEndBeforeStart');
  });

  it('終了日時が開始日時と同じ場合は EventEndBeforeStart エラーを返す', () => {
    const input = { ...baseInput, endsAt: futureStart };
    const result = createEvent(input);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('EventEndBeforeStart');
  });

  it('description が null の場合は null が設定される', () => {
    const input = { ...baseInput, description: null };
    const result = createEvent(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.description).toBeNull();
  });

  it('OFFLINE 形式のイベントを作成できる', () => {
    const input = { ...baseInput, format: 'OFFLINE' as const };
    const result = createEvent(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.format).toBe('OFFLINE');
  });

  it('HYBRID 形式のイベントを作成できる', () => {
    const input = { ...baseInput, format: 'HYBRID' as const };
    const result = createEvent(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.format).toBe('HYBRID');
  });
});
