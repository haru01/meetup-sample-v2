import { describe, it, expect } from 'vitest';
import type { AccountId, CommunityId, CommunityMemberId } from '../schemas/common';
import {
  createAccountId,
  createCommunityId,
  createCommunityMemberId,
} from '../schemas/id-factories';

// UUID形式の検証用正規表現
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

  it('カスタム文字列IDを受け付ける', () => {
    const customId = 'custom-account-id-123';
    const id = createAccountId(customId);
    expect(id).toBe(customId);
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

  it('カスタム文字列IDを受け付ける', () => {
    const customId = 'custom-community-id-456';
    const id = createCommunityId(customId);
    expect(id).toBe(customId);
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

  it('カスタム文字列IDを受け付ける', () => {
    const customId = 'custom-member-id-789';
    const id = createCommunityMemberId(customId);
    expect(id).toBe(customId);
  });

  it('CommunityMemberId型として使用できる', () => {
    const id: CommunityMemberId = createCommunityMemberId();
    expect(typeof id).toBe('string');
  });
});
