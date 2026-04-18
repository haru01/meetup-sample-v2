import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import type { AccountId, CommunityId, CommunityMemberId } from '../schemas/common';
import {
  createAccountId,
  createCommunityId,
  createCommunityMemberId,
  parseAccountId,
  parseCommunityId,
  parseCommunityMemberId,
  parseEventId,
} from '../schemas/id-factories';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('createAccountId', () => {
  it('引数なしで呼び出すと有効なUUIDを生成する', () => {
    const id = createAccountId();
    expect(UUID_REGEX.test(id)).toBe(true);
  });

  it('毎回異なるUUIDを生成する', () => {
    const id1 = createAccountId();
    const id2 = createAccountId();
    expect(id1).not.toBe(id2);
  });

  it('UUID文字列を受け付ける', () => {
    const uuid = randomUUID();
    const id = createAccountId(uuid);
    expect(id).toBe(uuid);
  });

  it('UUID形式でない文字列は拒否する', () => {
    expect(() => createAccountId('not-a-uuid')).toThrow();
  });

  it('AccountId型として使用できる', () => {
    const id: AccountId = createAccountId();
    expect(typeof id).toBe('string');
  });
});

describe('createCommunityId', () => {
  it('引数なしで呼び出すと有効なUUIDを生成する', () => {
    const id = createCommunityId();
    expect(UUID_REGEX.test(id)).toBe(true);
  });

  it('毎回異なるUUIDを生成する', () => {
    const id1 = createCommunityId();
    const id2 = createCommunityId();
    expect(id1).not.toBe(id2);
  });

  it('UUID文字列を受け付ける', () => {
    const uuid = randomUUID();
    const id = createCommunityId(uuid);
    expect(id).toBe(uuid);
  });

  it('UUID形式でない文字列は拒否する', () => {
    expect(() => createCommunityId('not-a-uuid')).toThrow();
  });

  it('CommunityId型として使用できる', () => {
    const id: CommunityId = createCommunityId();
    expect(typeof id).toBe('string');
  });
});

describe('createCommunityMemberId', () => {
  it('引数なしで呼び出すと有効なUUIDを生成する', () => {
    const id = createCommunityMemberId();
    expect(UUID_REGEX.test(id)).toBe(true);
  });

  it('毎回異なるUUIDを生成する', () => {
    const id1 = createCommunityMemberId();
    const id2 = createCommunityMemberId();
    expect(id1).not.toBe(id2);
  });

  it('UUID文字列を受け付ける', () => {
    const uuid = randomUUID();
    const id = createCommunityMemberId(uuid);
    expect(id).toBe(uuid);
  });

  it('UUID形式でない文字列は拒否する', () => {
    expect(() => createCommunityMemberId('not-a-uuid')).toThrow();
  });

  it('CommunityMemberId型として使用できる', () => {
    const id: CommunityMemberId = createCommunityMemberId();
    expect(typeof id).toBe('string');
  });
});

describe('parseAccountId', () => {
  it('有効な UUID を渡すと ok(AccountId) を返す', () => {
    const uuid = randomUUID();
    const result = parseAccountId(uuid, 'accountId');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(uuid);
  });

  it('不正な UUID を渡すと err(InvalidIdFormat) を返す', () => {
    const result = parseAccountId('not-a-uuid', 'accountId');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('InvalidIdFormat');
      expect(result.error.field).toBe('accountId');
      expect(result.error.value).toBe('not-a-uuid');
    }
  });

  it('空文字列も err を返す', () => {
    const result = parseAccountId('', 'accountId');
    expect(result.ok).toBe(false);
  });
});

describe('parseCommunityId', () => {
  it('有効な UUID を渡すと ok(CommunityId) を返す', () => {
    const uuid = randomUUID();
    const result = parseCommunityId(uuid, 'communityId');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(uuid);
  });

  it('不正な UUID を渡すと err(InvalidIdFormat) を返す', () => {
    const result = parseCommunityId('xxx', 'communityId');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('InvalidIdFormat');
  });
});

describe('parseCommunityMemberId', () => {
  it('有効な UUID を渡すと ok(CommunityMemberId) を返す', () => {
    const uuid = randomUUID();
    const result = parseCommunityMemberId(uuid, 'memberId');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(uuid);
  });

  it('不正な UUID を渡すと err(InvalidIdFormat) を返す', () => {
    const result = parseCommunityMemberId('xxx', 'memberId');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('InvalidIdFormat');
  });
});

describe('parseEventId', () => {
  it('有効な UUID を渡すと ok(EventId) を返す', () => {
    const uuid = randomUUID();
    const result = parseEventId(uuid, 'eventId');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(uuid);
  });

  it('不正な UUID を渡すと err(InvalidIdFormat) を返す', () => {
    const result = parseEventId('xxx', 'eventId');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('InvalidIdFormat');
      expect(result.error.field).toBe('eventId');
    }
  });
});
