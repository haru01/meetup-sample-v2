import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createRequireCommunityRole } from '../community-role.middleware';
import type { CommunityMemberRepository } from '@/community/repositories/community-member.repository';
import { CommunityMemberRole } from '@/community/models/schemas/member.schema';
import {
  createCommunityId,
  createCommunityMemberId,
  createAccountId,
} from '@shared/schemas/id-factories';

const makeMemberRepository = (): CommunityMemberRepository => ({
  findByIds: vi.fn().mockResolvedValue(null),
  findById: vi.fn().mockResolvedValue(null),
  save: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  findByCommunityId: vi.fn().mockResolvedValue({ members: [], total: 0 }),
});

const makeRequest = (communityId: string, accountId: string): Partial<Request> => ({
  params: { id: communityId },
  accountId,
});

const makeResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('createRequireCommunityRole', () => {
  let memberRepo: CommunityMemberRepository;
  let next: NextFunction;

  beforeEach(() => {
    memberRepo = makeMemberRepository();
    next = vi.fn();
  });

  it('OWNER ロールのメンバーが OWNER/ADMIN 要求を通過する', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue({
      id: createCommunityMemberId('member-1'),
      communityId,
      accountId,
      role: CommunityMemberRole.OWNER,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const middleware = createRequireCommunityRole(
      memberRepo,
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN
    );
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('ADMIN ロールのメンバーが OWNER/ADMIN 要求を通過する', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue({
      id: createCommunityMemberId('member-1'),
      communityId,
      accountId,
      role: CommunityMemberRole.ADMIN,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const middleware = createRequireCommunityRole(
      memberRepo,
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN
    );
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();
    await middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('MEMBER ロールのメンバーが OWNER/ADMIN 要求で 403 を返す', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue({
      id: createCommunityMemberId('member-1'),
      communityId,
      accountId,
      role: CommunityMemberRole.MEMBER,
      status: 'ACTIVE',
      createdAt: new Date(),
    });

    const middleware = createRequireCommunityRole(
      memberRepo,
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN
    );
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();
    await middleware(req as Request, res as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      code: 'FORBIDDEN',
      message: 'この操作を行う権限がありません',
    });
  });

  it('メンバーが見つからない場合は 403 を返す', async () => {
    const communityId = createCommunityId('community-1');
    const accountId = createAccountId('account-1');
    vi.mocked(memberRepo.findByIds).mockResolvedValue(null);

    const middleware = createRequireCommunityRole(
      memberRepo,
      CommunityMemberRole.OWNER,
      CommunityMemberRole.ADMIN
    );
    const req = makeRequest(communityId, accountId);
    const res = makeResponse();
    await middleware(req as Request, res as Response, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
