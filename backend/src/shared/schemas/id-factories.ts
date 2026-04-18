import { randomUUID } from 'node:crypto';
import {
  AccountIdSchema,
  CommunityIdSchema,
  CommunityMemberIdSchema,
  EventIdSchema,
  type AccountId,
  type CommunityId,
  type CommunityMemberId,
  type EventId,
} from './common.js';

// ============================================================
// AccountId Factories
// ============================================================

/**
 * AccountIdを生成する
 *
 * @param id 指定した場合はその文字列をAccountIdとして使用する。省略時はランダムUUIDを生成する。
 * @returns AccountId
 */
export function createAccountId(id?: string): AccountId {
  return AccountIdSchema.parse(id ?? randomUUID());
}

// ============================================================
// CommunityId Factories
// ============================================================

/**
 * CommunityIdを生成する
 *
 * @param id 指定した場合はその文字列をCommunityIdとして使用する。省略時はランダムUUIDを生成する。
 * @returns CommunityId
 */
export function createCommunityId(id?: string): CommunityId {
  return CommunityIdSchema.parse(id ?? randomUUID());
}

// ============================================================
// CommunityMemberId Factories
// ============================================================

/**
 * CommunityMemberIdを生成する
 *
 * @param id 指定した場合はその文字列をCommunityMemberIdとして使用する。省略時はランダムUUIDを生成する。
 * @returns CommunityMemberId
 */
export function createCommunityMemberId(id?: string): CommunityMemberId {
  return CommunityMemberIdSchema.parse(id ?? randomUUID());
}

// ============================================================
// EventId Factories
// ============================================================

/**
 * EventIdを生成する
 *
 * @param id 指定した場合はその文字列をEventIdとして使用する。省略時はランダムUUIDを生成する。
 * @returns EventId
 */
export function createEventId(id?: string): EventId {
  return EventIdSchema.parse(id ?? randomUUID());
}
