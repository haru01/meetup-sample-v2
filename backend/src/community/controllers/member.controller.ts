import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '@shared/middleware/auth.middleware';
import { createCommunityMemberId } from '@shared/schemas/id-factories';
import type { AccountId, CommunityId, CommunityMemberId } from '@shared/schemas/common';
import type { CommunityMember } from '../models/community-member';
import {
  mapJoinCommunityErrorToResponse,
  mapLeaveCommunityErrorToResponse,
  mapListMembersErrorToResponse,
  mapApproveMemberErrorToResponse,
  mapRejectMemberErrorToResponse,
} from './member-error-mappings';
import type { MemberDependencies } from '../composition';

// ============================================================
// レスポンス変換
// ============================================================

function toMemberResponse(member: CommunityMember): Record<string, unknown> {
  return {
    id: member.id,
    communityId: member.communityId,
    accountId: member.accountId,
    role: member.role,
    status: member.status,
    createdAt: member.createdAt.toISOString(),
  };
}

// ============================================================
// Member ルーター作成
// ============================================================

/**
 * Member ルーターを作成する
 *
 * @param deps メンバーコンテキストの依存性
 */
// eslint-disable-next-line max-lines-per-function
export function createMemberRouter(deps: MemberDependencies): Router {
  const router = Router({ mergeParams: true });

  const {
    joinCommunityCommand,
    leaveCommunityCommand,
    approveMemberCommand,
    rejectMemberCommand,
    listMembersReadQuery,
    requireCommunityRole,
  } = deps;

  /**
   * POST /communities/:id/members — コミュニティ参加
   */
  router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const communityId = req.params['id'] as CommunityId;
    const accountId = req.accountId as AccountId;
    const memberId = createCommunityMemberId();

    const result = await joinCommunityCommand({
      communityId,
      accountId,
      memberId,
    });

    if (!result.ok) {
      const { status, response } = mapJoinCommunityErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(201).json(toMemberResponse(result.value));
  });

  /**
   * DELETE /communities/:id/members/me — コミュニティ脱退
   */
  router.delete('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const communityId = req.params['id'] as CommunityId;
    const accountId = req.accountId as AccountId;

    const result = await leaveCommunityCommand({
      communityId,
      accountId,
    });

    if (!result.ok) {
      const { status, response } = mapLeaveCommunityErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(200).json({});
  });

  /**
   * DELETE /communities/:id/members/:memberId — メンバーID指定でコミュニティ脱退
   */
  router.delete('/:memberId', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const communityId = req.params['id'] as CommunityId;
    const memberId = req.params['memberId'] as CommunityMemberId;
    const accountId = req.accountId as AccountId;

    const result = await leaveCommunityCommand({
      communityId,
      accountId,
      memberId,
    });

    if (!result.ok) {
      const { status, response } = mapLeaveCommunityErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(200).json({});
  });

  /**
   * GET /communities/:id/members — メンバー一覧（Read モデル）
   */
  router.get('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const communityId = req.params['id'] as CommunityId;
    const limit = parseInt((req.query['limit'] as string | undefined) ?? '20', 10);
    const offset = parseInt((req.query['offset'] as string | undefined) ?? '0', 10);

    const result = await listMembersReadQuery({ communityId, limit, offset });

    if (!result.ok) {
      const { status, response } = mapListMembersErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(200).json({
      members: result.value.members.map((m) => ({
        id: m.id,
        communityId: m.communityId,
        accountId: m.accountId,
        accountName: m.accountName,
        role: m.role,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
      total: result.value.total,
    });
  });

  /**
   * PATCH /communities/:id/members/:memberId/approve — メンバー承認
   */
  router.patch(
    '/:memberId/approve',
    requireAuth,
    requireCommunityRole,
    async (req: Request, res: Response): Promise<void> => {
      const communityId = req.params['id'] as CommunityId;
      const targetMemberId = req.params['memberId'] as CommunityMemberId;

      const result = await approveMemberCommand({
        communityId,
        targetMemberId,
      });

      if (!result.ok) {
        const { status, response } = mapApproveMemberErrorToResponse(result.error);
        res.status(status).json(response);
        return;
      }

      res.status(200).json(toMemberResponse(result.value));
    }
  );

  /**
   * PATCH /communities/:id/members/:memberId/reject — メンバー拒否
   */
  router.patch(
    '/:memberId/reject',
    requireAuth,
    requireCommunityRole,
    async (req: Request, res: Response): Promise<void> => {
      const communityId = req.params['id'] as CommunityId;
      const targetMemberId = req.params['memberId'] as CommunityMemberId;

      const result = await rejectMemberCommand({
        communityId,
        targetMemberId,
      });

      if (!result.ok) {
        const { status, response } = mapRejectMemberErrorToResponse(result.error);
        res.status(status).json(response);
        return;
      }

      res.status(204).send();
    }
  );

  return router;
}
