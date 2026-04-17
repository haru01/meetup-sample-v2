import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth, optionalAuth } from '@shared/middleware/auth.middleware';
import { createCommunityId, createCommunityMemberId } from '@shared/schemas/id-factories';
import type { AccountId, CommunityId } from '@shared/schemas/common';
import {
  mapCreateCommunityErrorToResponse,
  mapGetCommunityErrorToResponse,
} from './community-error-mappings';
import type { Community } from '../models/community';
import type { CommunityCategory, CommunityVisibility } from '../models/schemas/community.schema';
import type { CommunityDependencies } from '../composition';

// ============================================================
// コミュニティレスポンス変換
// ============================================================

function toCommunityResponse(community: Community): Record<string, unknown> {
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    category: community.category,
    visibility: community.visibility,
    createdAt: community.createdAt.toISOString(),
    updatedAt: community.updatedAt.toISOString(),
  };
}

// ============================================================
// コミュニティルーターファクトリ
// ============================================================

/**
 * コミュニティルーターを作成する
 *
 * @param deps コミュニティコンテキストの依存性
 */
// eslint-disable-next-line max-lines-per-function
export function createCommunityRouter(deps: CommunityDependencies): Router {
  const router = Router();

  const { createCommunityCommand, getCommunityQuery, listCommunitiesQuery } = deps;

  /**
   * POST /communities - コミュニティ作成
   */
  router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const now = new Date();

    const command = {
      id: createCommunityId(),
      ownerMemberId: createCommunityMemberId(),
      accountId: req.accountId as AccountId,
      name: req.body.name as string,
      description: (req.body.description as string | null | undefined) ?? null,
      category: req.body.category as CommunityCategory,
      visibility: req.body.visibility as CommunityVisibility,
      createdAt: now,
      updatedAt: now,
    };

    const result = await createCommunityCommand(command);

    if (!result.ok) {
      const { status, response } = mapCreateCommunityErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(201).json({ community: toCommunityResponse(result.value.community) });
  });

  /**
   * GET /communities - コミュニティ一覧取得
   */
  router.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    const memberFilter = req.query['member'];
    const category = req.query['category'] as string | undefined;
    const limit = Math.min(parseInt(req.query['limit'] as string, 10) || 20, 100);
    const offset = parseInt(req.query['offset'] as string, 10) || 0;

    // ?member=me は認証が必要
    if (memberFilter === 'me' && !req.accountId) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const command = {
      category,
      memberAccountId: memberFilter === 'me' ? (req.accountId as AccountId) : undefined,
      limit,
      offset,
    };

    const result = await listCommunitiesQuery(command);

    if (!result.ok) {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }

    res.status(200).json({
      communities: result.value.communities.map(toCommunityResponse),
      total: result.value.total,
    });
  });

  /**
   * GET /communities/:id - コミュニティ取得
   */
  router.get('/:id', optionalAuth, async (req: Request, res: Response): Promise<void> => {
    const command = {
      communityId: req.params['id'] as CommunityId,
      requestingAccountId: req.accountId as AccountId | undefined,
    };

    const result = await getCommunityQuery(command);

    if (!result.ok) {
      const { status, response } = mapGetCommunityErrorToResponse(result.error);
      res.status(status).json(response);
      return;
    }

    res.status(200).json({ community: toCommunityResponse(result.value) });
  });

  return router;
}
