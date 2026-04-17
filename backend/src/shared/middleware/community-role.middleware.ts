import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { CommunityMemberRepository } from '@/community/repositories/community-member.repository';
import type { CommunityMemberRole } from '@/community/models/schemas/member.schema';
import type { AccountId, CommunityId } from '@shared/schemas/common';

// ============================================================
// Express Request 型拡張
// ============================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      communityMember?: {
        id: string;
        role: string;
        communityId: string;
      };
    }
  }
}

// ============================================================
// コミュニティロール要求ミドルウェア
// ============================================================

/**
 * 指定されたロールのいずれかを持つコミュニティメンバーのみ通過を許可する
 *
 * @param memberRepo メンバーリポジトリ
 * @param roles 許可するロール
 * @returns Express ミドルウェア
 */
export function createRequireCommunityRole(
  memberRepo: CommunityMemberRepository,
  ...roles: CommunityMemberRole[]
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const communityId = req.params['id'] as CommunityId;
    const accountId = req.accountId as AccountId;

    const member = await memberRepo.findByIds(communityId, accountId);

    if (!member || !roles.includes(member.role as CommunityMemberRole)) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'この操作を行う権限がありません',
      });
      return;
    }

    req.communityMember = {
      id: member.id,
      role: member.role,
      communityId: member.communityId,
    };

    next();
  };
}
