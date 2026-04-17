import { describe, it, expect } from 'vitest';
import { createCommunity } from '../community';
import {
  createCommunityId,
  createCommunityMemberId,
  createAccountId,
} from '@shared/schemas/id-factories';

describe('createCommunity', () => {
  const baseInput = {
    id: createCommunityId(),
    name: 'テストコミュニティ',
    description: 'テスト用の説明',
    category: 'TECH' as const,
    visibility: 'PUBLIC' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ownerAccountId: createAccountId(),
    ownerMemberId: createCommunityMemberId(),
  };

  it('コミュニティとオーナーメンバーを生成して返す', () => {
    const result = createCommunity(baseInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.community).toBeDefined();
    expect(result.value.ownerMember).toBeDefined();
  });

  it('生成されたコミュニティのフィールドが正しい', () => {
    const result = createCommunity(baseInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { community } = result.value;
    expect(community.id).toBe(baseInput.id);
    expect(community.name).toBe(baseInput.name);
    expect(community.description).toBe(baseInput.description);
    expect(community.category).toBe(baseInput.category);
    expect(community.visibility).toBe(baseInput.visibility);
    expect(community.createdAt).toBe(baseInput.createdAt);
    expect(community.updatedAt).toBe(baseInput.updatedAt);
  });

  it('オーナーメンバーはACTIVEステータスでOWNERロールを持つ', () => {
    const result = createCommunity(baseInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { ownerMember } = result.value;
    expect(ownerMember.role).toBe('OWNER');
    expect(ownerMember.status).toBe('ACTIVE');
    expect(ownerMember.accountId).toBe(baseInput.ownerAccountId);
    expect(ownerMember.communityId).toBe(baseInput.id);
    expect(ownerMember.id).toBe(baseInput.ownerMemberId);
  });

  it('descriptionがnullの場合はnullが設定される', () => {
    const input = { ...baseInput, description: null };
    const result = createCommunity(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.community.description).toBeNull();
  });

  it('BUSINESSカテゴリのコミュニティを作成できる', () => {
    const input = { ...baseInput, category: 'BUSINESS' as const };
    const result = createCommunity(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.community.category).toBe('BUSINESS');
  });

  it('PRIVATEコミュニティを作成できる', () => {
    const input = { ...baseInput, visibility: 'PRIVATE' as const };
    const result = createCommunity(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.community.visibility).toBe('PRIVATE');
  });
});
