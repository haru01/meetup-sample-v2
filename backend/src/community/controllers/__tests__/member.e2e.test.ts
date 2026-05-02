import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../../app';
import {
  createTestPrismaClient,
  cleanupTestPrismaClient,
  clearAuthTables,
} from '../../../infrastructure/test-helper';
import type { CommunityVisibility } from '../../models/schemas/community.schema';

// ============================================================
// テストヘルパー
// ============================================================

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  prisma = createTestPrismaClient();
  app = createApp(prisma);
});

afterAll(async () => {
  await cleanupTestPrismaClient(prisma);
});

/**
 * アカウントを登録してトークンを返す
 */
async function アカウントを登録してトークンを取得する(
  email: string,
  name: string = 'テストユーザー'
): Promise<{ accountId: string; token: string }> {
  const registerRes = await request(app)
    .post('/auth/register')
    .send({ name, email, password: 'password123' })
    .expect(201);
  const accountId = registerRes.body.account.id as string;
  const token = registerRes.body.token as string;

  return { accountId, token };
}

/**
 * コミュニティを作成してIDを返す
 */
async function コミュニティを作成する(
  token: string,
  name: string = 'テストコミュニティ',
  visibility: CommunityVisibility = 'PUBLIC'
): Promise<string> {
  const res = await request(app)
    .post('/communities')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      description: 'テスト用コミュニティ',
      category: 'TECH',
      visibility,
    })
    .expect(201);
  return res.body.community.id as string;
}

// ============================================================
// POST /communities/:id/members
// ============================================================

describe('POST /communities/:id/members — コミュニティ参加', () => {
  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  describe('PUBLIC コミュニティに参加する場合', () => {
    it('201 が返り、status が ACTIVE であること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner@example.com', 'オーナー');
      const communityId = await コミュニティを作成する(
        owner.token,
        'パブリックコミュニティ',
        'PUBLIC'
      );

      const member = await アカウントを登録してトークンを取得する('member@example.com', 'メンバー');

      const res = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      expect(res.body.communityId).toBe(communityId);
      expect(res.body.accountId).toBe(member.accountId);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.role).toBe('MEMBER');
      expect(res.body.id).toBeDefined();
    });
  });

  describe('PRIVATE コミュニティに参加する場合', () => {
    it('201 が返り、status が PENDING であること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner2@example.com', 'オーナー2');
      const communityId = await コミュニティを作成する(
        owner.token,
        'プライベートコミュニティ',
        'PRIVATE'
      );

      const member = await アカウントを登録してトークンを取得する(
        'member2@example.com',
        'メンバー2'
      );

      const res = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      expect(res.body.status).toBe('PENDING');
    });
  });

  describe('存在しないコミュニティに参加しようとした場合', () => {
    it('404 COMMUNITY_NOT_FOUND が返ること', async () => {
      const member = await アカウントを登録してトークンを取得する(
        'member3@example.com',
        'メンバー3'
      );
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .post(`/communities/${nonExistentId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(404);

      expect(res.body.code).toBe('COMMUNITY_NOT_FOUND');
    });
  });

  describe('既に参加済みのコミュニティに参加しようとした場合', () => {
    it('409 ALREADY_MEMBER が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner3@example.com', 'オーナー3');
      const communityId = await コミュニティを作成する(owner.token, '重複参加テスト', 'PUBLIC');

      const member = await アカウントを登録してトークンを取得する(
        'member4@example.com',
        'メンバー4'
      );

      await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      const res = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(409);

      expect(res.body.code).toBe('ALREADY_MEMBER');
    });
  });

  describe('認証トークンがない場合', () => {
    it('401 が返ること', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app).post(`/communities/${nonExistentId}/members`).expect(401);
    });
  });
});

// ============================================================
// DELETE /communities/:id/members/me
// ============================================================

describe('DELETE /communities/:id/members/me — コミュニティ脱退', () => {
  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  describe('メンバーがコミュニティを脱退する場合', () => {
    it('200 が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner4@example.com', 'オーナー4');
      const communityId = await コミュニティを作成する(owner.token, '脱退テスト', 'PUBLIC');

      const member = await アカウントを登録してトークンを取得する(
        'member5@example.com',
        'メンバー5'
      );

      await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      await request(app)
        .delete(`/communities/${communityId}/members/me`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(200);
    });
  });

  describe('オーナーが脱退しようとした場合', () => {
    it('422 OWNER_CANNOT_LEAVE が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner5@example.com', 'オーナー5');
      const communityId = await コミュニティを作成する(owner.token, 'オーナー脱退テスト', 'PUBLIC');

      const res = await request(app)
        .delete(`/communities/${communityId}/members/me`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(422);

      expect(res.body.code).toBe('OWNER_CANNOT_LEAVE');
    });
  });

  describe('認証トークンがない場合', () => {
    it('401 が返ること', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app).delete(`/communities/${nonExistentId}/members/me`).expect(401);
    });
  });
});

// ============================================================
// GET /communities/:id/members
// ============================================================

describe('GET /communities/:id/members — メンバー一覧取得', () => {
  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  describe('コミュニティのメンバー一覧を取得する場合', () => {
    it('200 が返り、members と total が含まれること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner6@example.com', 'オーナー6');
      const communityId = await コミュニティを作成する(owner.token, '一覧テスト', 'PUBLIC');

      const member = await アカウントを登録してトークンを取得する(
        'member6@example.com',
        'メンバー6'
      );
      await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      const res = await request(app)
        .get(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      expect(res.body.members).toBeDefined();
      expect(Array.isArray(res.body.members)).toBe(true);
      // オーナーとメンバーの2人
      expect(res.body.total).toBe(2);
      expect(res.body.members.length).toBe(2);
      // Read モデルで accountName が返ること
      const names = res.body.members.map((m: { accountName: string }) => m.accountName);
      expect(names).toContain('オーナー6');
      expect(names).toContain('メンバー6');
    });
  });

  describe('存在しないコミュニティのメンバー一覧を取得しようとした場合', () => {
    it('404 COMMUNITY_NOT_FOUND が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner7@example.com', 'オーナー7');
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/communities/${nonExistentId}/members`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(404);

      expect(res.body.code).toBe('COMMUNITY_NOT_FOUND');
    });
  });

  describe('認証トークンがない場合', () => {
    it('PUBLIC コミュニティは認証なしでもメンバー一覧を参照できること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-anon@example.com',
        'オーナー匿名'
      );
      const communityId = await コミュニティを作成する(owner.token, '匿名閲覧テスト', 'PUBLIC');

      const res = await request(app).get(`/communities/${communityId}/members`).expect(200);

      expect(Array.isArray(res.body.members)).toBe(true);
      expect(res.body.total).toBe(1);
      expect(res.body.members[0].accountName).toBe('オーナー匿名');
    });

    it('存在しないコミュニティは 404 が返ること', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app).get(`/communities/${nonExistentId}/members`).expect(404);
    });

    it('PRIVATE コミュニティは認証なしでは 404 が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-private-anon@example.com',
        'オーナー private 匿名'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        'プライベート匿名テスト',
        'PRIVATE'
      );

      const res = await request(app).get(`/communities/${communityId}/members`).expect(404);
      expect(res.body.code).toBe('COMMUNITY_NOT_FOUND');
    });
  });

  describe('PRIVATE コミュニティの場合', () => {
    it('非メンバーのアカウントでは 404 が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-private-nonmember@example.com',
        'オーナー private'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        'プライベート非メンバーテスト',
        'PRIVATE'
      );

      const stranger = await アカウントを登録してトークンを取得する(
        'stranger@example.com',
        '部外者'
      );

      const res = await request(app)
        .get(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .expect(404);
      expect(res.body.code).toBe('COMMUNITY_NOT_FOUND');
    });

    it('PENDING メンバーでは 404 が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-private-pending@example.com',
        'オーナー private pending'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        'プライベート PENDING テスト',
        'PRIVATE'
      );

      const pendingMember = await アカウントを登録してトークンを取得する(
        'pending@example.com',
        'PENDING メンバー'
      );
      // PRIVATE では PENDING で参加する
      await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${pendingMember.token}`)
        .expect(201);

      const res = await request(app)
        .get(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${pendingMember.token}`)
        .expect(404);
      expect(res.body.code).toBe('COMMUNITY_NOT_FOUND');
    });

    it('ACTIVE メンバーでは 200 が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-private-active@example.com',
        'オーナー private active'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        'プライベート ACTIVE テスト',
        'PRIVATE'
      );

      const res = await request(app)
        .get(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.members[0].accountName).toBe('オーナー private active');
    });
  });

  describe('accountId の可視性（列挙防止）', () => {
    it('未ログイン requester には accountId を返さないこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-anon-acct@example.com',
        'オーナー匿名 acct'
      );
      const communityId = await コミュニティを作成する(owner.token, '匿名acct テスト', 'PUBLIC');

      const res = await request(app).get(`/communities/${communityId}/members`).expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.members[0].accountId).toBeUndefined();
      expect(res.body.members[0].accountName).toBe('オーナー匿名 acct');
    });

    it('ログイン済みだが非メンバーの requester には accountId を返さないこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-nonmember-acct@example.com',
        'オーナー nonmember'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        '非メンバーacct テスト',
        'PUBLIC'
      );
      const stranger = await アカウントを登録してトークンを取得する(
        'stranger-acct@example.com',
        '部外者 acct'
      );

      const res = await request(app)
        .get(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${stranger.token}`)
        .expect(200);

      expect(res.body.members[0].accountId).toBeUndefined();
    });

    it('ACTIVE メンバーの requester には accountId を返すこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-member-acct@example.com',
        'オーナー member'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        'ACTIVEメンバーacct テスト',
        'PUBLIC'
      );

      const res = await request(app)
        .get(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      expect(res.body.members[0].accountId).toBeDefined();
      expect(typeof res.body.members[0].accountId).toBe('string');
    });
  });

  describe('limit/offset の検証', () => {
    it('limit=999999 など上限 100 を超える場合は 400 を返すこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-limit-over@example.com',
        'オーナー limit over'
      );
      const communityId = await コミュニティを作成する(owner.token, 'limit 超過テスト', 'PUBLIC');

      await request(app).get(`/communities/${communityId}/members?limit=999999`).expect(400);
    });

    it('limit=-1 など負値の場合は 400 を返すこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-limit-neg@example.com',
        'オーナー limit neg'
      );
      const communityId = await コミュニティを作成する(owner.token, 'limit 負値テスト', 'PUBLIC');

      await request(app).get(`/communities/${communityId}/members?limit=-1`).expect(400);
    });

    it('limit=abc など数値でない場合は 400 を返すこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-limit-nan@example.com',
        'オーナー limit NaN'
      );
      const communityId = await コミュニティを作成する(owner.token, 'limit 非数値テスト', 'PUBLIC');

      await request(app).get(`/communities/${communityId}/members?limit=abc`).expect(400);
    });

    it('offset=-1 など負値の場合は 400 を返すこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-offset-neg@example.com',
        'オーナー offset neg'
      );
      const communityId = await コミュニティを作成する(owner.token, 'offset 負値テスト', 'PUBLIC');

      await request(app).get(`/communities/${communityId}/members?offset=-1`).expect(400);
    });

    it('limit=100（上限ぴったり）は 200 を返すこと', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-limit-ok@example.com',
        'オーナー limit OK'
      );
      const communityId = await コミュニティを作成する(owner.token, 'limit OK テスト', 'PUBLIC');

      await request(app).get(`/communities/${communityId}/members?limit=100`).expect(200);
    });
  });
});

// ============================================================
// PATCH /communities/:id/members/:memberId/approve
// ============================================================

describe('PATCH /communities/:id/members/:memberId/approve — メンバー承認', () => {
  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  describe('オーナーが PENDING メンバーを承認する場合', () => {
    it('200 が返り、status が ACTIVE に変わること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner8@example.com', 'オーナー8');
      const communityId = await コミュニティを作成する(owner.token, '承認テスト', 'PRIVATE');

      const member = await アカウントを登録してトークンを取得する(
        'member7@example.com',
        'メンバー7'
      );
      const joinRes = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      const memberId = joinRes.body.id as string;

      const res = await request(app)
        .patch(`/communities/${communityId}/members/${memberId}/approve`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.id).toBe(memberId);
    });
  });

  describe('権限のないメンバーが承認しようとした場合', () => {
    it('403 NOT_AUTHORIZED が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する('owner9@example.com', 'オーナー9');
      const communityId = await コミュニティを作成する(owner.token, '権限テスト', 'PRIVATE');

      const member1 = await アカウントを登録してトークンを取得する(
        'member8@example.com',
        'メンバー8'
      );
      const joinRes = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member1.token}`)
        .expect(201);
      const member1Id = joinRes.body.id as string;

      // 承認してからMEMBERにしておく
      await request(app)
        .patch(`/communities/${communityId}/members/${member1Id}/approve`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      // 新たな参加者
      const member2 = await アカウントを登録してトークンを取得する(
        'member9@example.com',
        'メンバー9'
      );
      const joinRes2 = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member2.token}`)
        .expect(201);
      const member2Id = joinRes2.body.id as string;

      // member1 (MEMBER ロール) が承認しようとする → 403
      const res = await request(app)
        .patch(`/communities/${communityId}/members/${member2Id}/approve`)
        .set('Authorization', `Bearer ${member1.token}`)
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('認証トークンがない場合', () => {
    it('401 が返ること', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .patch(`/communities/${nonExistentId}/members/${nonExistentId}/approve`)
        .expect(401);
    });
  });
});

// ============================================================
// PATCH /communities/:id/members/:memberId/reject
// ============================================================

describe('PATCH /communities/:id/members/:memberId/reject — メンバー拒否', () => {
  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  describe('オーナーが PENDING メンバーを拒否する場合', () => {
    it('204 が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner10@example.com',
        'オーナー10'
      );
      const communityId = await コミュニティを作成する(owner.token, '拒否テスト', 'PRIVATE');

      const member = await アカウントを登録してトークンを取得する(
        'member10@example.com',
        'メンバー10'
      );
      const joinRes = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      const memberId = joinRes.body.id as string;

      await request(app)
        .patch(`/communities/${communityId}/members/${memberId}/reject`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(204);
    });
  });

  describe('権限のないメンバーが拒否しようとした場合', () => {
    it('403 NOT_AUTHORIZED が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner11@example.com',
        'オーナー11'
      );
      const communityId = await コミュニティを作成する(owner.token, '拒否権限テスト', 'PRIVATE');

      const member1 = await アカウントを登録してトークンを取得する(
        'member11@example.com',
        'メンバー11'
      );
      const joinRes1 = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member1.token}`)
        .expect(201);
      const member1Id = joinRes1.body.id as string;

      // member1 を ACTIVE にしておく
      await request(app)
        .patch(`/communities/${communityId}/members/${member1Id}/approve`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      // member2 が参加申請
      const member2 = await アカウントを登録してトークンを取得する(
        'member12@example.com',
        'メンバー12'
      );
      const joinRes2 = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member2.token}`)
        .expect(201);
      const member2Id = joinRes2.body.id as string;

      // member1 (MEMBER ロール) が拒否しようとする → 403
      const res = await request(app)
        .patch(`/communities/${communityId}/members/${member2Id}/reject`)
        .set('Authorization', `Bearer ${member1.token}`)
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('認証トークンがない場合', () => {
    it('401 が返ること', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .patch(`/communities/${nonExistentId}/members/${nonExistentId}/reject`)
        .expect(401);
    });
  });

  describe('存在しないメンバーを拒否しようとした場合', () => {
    it('404 MEMBER_NOT_FOUND が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-reject-notfound@example.com',
        'オーナー reject notfound'
      );
      const communityId = await コミュニティを作成する(owner.token, '拒否存在テスト', 'PRIVATE');

      const nonExistentMemberId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .patch(`/communities/${communityId}/members/${nonExistentMemberId}/reject`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(404);

      expect(res.body.code).toBe('MEMBER_NOT_FOUND');
    });
  });
});

// ============================================================
// DELETE /communities/:id/members/:memberId
// ============================================================

describe('DELETE /communities/:id/members/:memberId — memberId 指定でコミュニティ脱退', () => {
  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  describe('メンバーが memberId 指定で脱退する場合', () => {
    it('200 が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-leave-byid@example.com',
        'オーナー leave byid'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        'memberId 脱退テスト',
        'PUBLIC'
      );

      const member = await アカウントを登録してトークンを取得する(
        'member-leave-byid@example.com',
        'メンバー leave byid'
      );
      const joinRes = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);

      const memberId = joinRes.body.id as string;

      await request(app)
        .delete(`/communities/${communityId}/members/${memberId}`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(200);
    });
  });

  describe('オーナーが自身の memberId で脱退しようとした場合', () => {
    it('422 OWNER_CANNOT_LEAVE が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-leave-byid-owner@example.com',
        'オーナー leave byid owner'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        'オーナー memberId 脱退テスト',
        'PUBLIC'
      );

      const membersRes = await request(app)
        .get(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      const ownerMemberId = membersRes.body.members[0].id as string;

      const res = await request(app)
        .delete(`/communities/${communityId}/members/${ownerMemberId}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(422);

      expect(res.body.code).toBe('OWNER_CANNOT_LEAVE');
    });
  });

  describe('認証トークンがない場合', () => {
    it('401 が返ること', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app)
        .delete(`/communities/${nonExistentId}/members/${nonExistentId}`)
        .expect(401);
    });
  });
});

// ============================================================
// PATCH approve ドメインエラーケース
// ============================================================

describe('PATCH /communities/:id/members/:memberId/approve — ドメインエラー', () => {
  beforeEach(async () => {
    await clearAuthTables(prisma);
  });

  describe('既に ACTIVE なメンバーを承認しようとした場合', () => {
    it('422 MEMBER_ALREADY_ACTIVE が返ること', async () => {
      const owner = await アカウントを登録してトークンを取得する(
        'owner-approve-already@example.com',
        'オーナー approve already'
      );
      const communityId = await コミュニティを作成する(
        owner.token,
        '承認済み再承認テスト',
        'PRIVATE'
      );

      const member = await アカウントを登録してトークンを取得する(
        'member-approve-already@example.com',
        'メンバー approve already'
      );
      const joinRes = await request(app)
        .post(`/communities/${communityId}/members`)
        .set('Authorization', `Bearer ${member.token}`)
        .expect(201);
      const memberId = joinRes.body.id as string;

      await request(app)
        .patch(`/communities/${communityId}/members/${memberId}/approve`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200);

      const res = await request(app)
        .patch(`/communities/${communityId}/members/${memberId}/approve`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(422);

      expect(res.body.code).toBe('MEMBER_ALREADY_ACTIVE');
    });
  });
});
