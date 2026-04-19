import { createHash } from 'node:crypto';
import {
  createAccountId,
  createCommunityId,
  createCommunityMemberId,
  createEventId,
} from '@shared/schemas/id-factories';
import type { AccountId, CommunityId, CommunityMemberId, EventId } from '@shared/schemas/common';

/**
 * 任意の文字列から決定的な UUID v4 形式文字列を生成する（テスト専用）。
 *
 * 可読なラベル（例: 'community-1'）を安定した UUID にマッピングするため、
 * 既存テストが保持していた意図（どの ID か）を残したまま UUID 検証を満たせる。
 */
export function deterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(seed).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  // version = 4 (random)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // variant = 10xx
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function testAccountId(seed: string): AccountId {
  return createAccountId(deterministicUuid(`account:${seed}`));
}

export function testCommunityId(seed: string): CommunityId {
  return createCommunityId(deterministicUuid(`community:${seed}`));
}

export function testCommunityMemberId(seed: string): CommunityMemberId {
  return createCommunityMemberId(deterministicUuid(`member:${seed}`));
}

export function testEventId(seed: string): EventId {
  return createEventId(deterministicUuid(`event:${seed}`));
}
