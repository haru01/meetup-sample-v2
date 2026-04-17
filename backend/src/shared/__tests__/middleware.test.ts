import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ============================================================
// テスト用ヘルパー
// ============================================================

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & {
  statusCode: number;
  body: unknown;
  status: (code: number) => Response;
  json: (body: unknown) => Response;
} {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
  } as unknown as Response & {
    statusCode: number;
    body: unknown;
    status: (code: number) => Response;
    json: (body: unknown) => Response;
  };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockImplementation((body) => {
    (res as unknown as { body: unknown }).body = body;
    return res;
  });
  return res;
}

function mockNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

// ============================================================
// エラーハンドラーミドルウェアのテスト
// ============================================================

describe('errorHandlerMiddleware', () => {
  let errorHandler: (err: unknown, req: Request, res: Response, next: NextFunction) => void;

  beforeEach(async () => {
    const module = await import('../middleware/error-handler.middleware');
    errorHandler = module.errorHandlerMiddleware;
  });

  describe('OpenAPI バリデーションエラー', () => {
    it('400 バリデーションエラーを 400 でレスポンスする', () => {
      const err = {
        status: 400,
        errors: [{ message: 'invalid parameter', path: '/body/name' }],
      };
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('invalid parameter'),
      });
    });

    it('422 バリデーションエラーを 422 でレスポンスする', () => {
      const err = {
        status: 422,
        errors: [{ message: 'unprocessable entity', path: '/body/email' }],
      };
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('unprocessable entity'),
      });
    });

    it('複数のエラーがある場合、メッセージを結合してレスポンスする', () => {
      const err = {
        status: 400,
        errors: [
          { message: 'name is required', path: '/body/name' },
          { message: 'email is invalid', path: '/body/email' },
        ],
      };
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      const jsonArg = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(jsonArg.message).toContain('name is required');
      expect(jsonArg.message).toContain('email is invalid');
    });
  });

  describe('不明なエラー', () => {
    it('Error インスタンスは 500 でレスポンスする', () => {
      const err = new Error('unexpected error');
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    });

    it('文字列エラーは 500 でレスポンスする', () => {
      const err = 'something went wrong';
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    });

    it('null エラーは 500 でレスポンスする', () => {
      const err = null;
      const req = mockReq();
      const res = mockRes();
      const next = mockNext();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    });
  });
});

// ============================================================
// 認証ミドルウェアのテスト
// ============================================================

describe('requireAuth', () => {
  const JWT_SECRET = 'default-dev-secret';

  let requireAuth: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(async () => {
    const module = await import('../middleware/auth.middleware');
    requireAuth = module.requireAuth;
  });

  describe('有効な JWT トークン', () => {
    it('Bearer トークンから accountId を抽出して req に付与し next を呼ぶ', () => {
      const accountId = 'acc-123';
      const token = jwt.sign({ accountId }, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockRes();
      const next = mockNext();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect((req as unknown as { accountId: string }).accountId).toBe(accountId);
    });
  });

  describe('トークンなし', () => {
    it('Authorization ヘッダーがない場合は 401 を返す', () => {
      const req = mockReq({ headers: {} });
      const res = mockRes();
      const next = mockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: expect.any(String),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('Bearer プレフィックスがない場合は 401 を返す', () => {
      const req = mockReq({
        headers: { authorization: 'invalid-token' },
      });
      const res = mockRes();
      const next = mockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('期限切れトークン', () => {
    it('有効期限切れのトークンは 401 を返す', () => {
      const token = jwt.sign({ accountId: 'acc-123' }, JWT_SECRET, {
        expiresIn: -1,
      });
      const req = mockReq({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockRes();
      const next = mockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        code: 'UNAUTHORIZED',
        message: expect.any(String),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('不正なトークン', () => {
    it('署名が不正なトークンは 401 を返す', () => {
      const token = jwt.sign({ accountId: 'acc-123' }, 'wrong-secret');
      const req = mockReq({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockRes();
      const next = mockNext();

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('optionalAuth', () => {
  const JWT_SECRET = 'default-dev-secret';

  let optionalAuth: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(async () => {
    const module = await import('../middleware/auth.middleware');
    optionalAuth = module.optionalAuth;
  });

  describe('有効な JWT トークン', () => {
    it('Bearer トークンから accountId を抽出して req に付与し next を呼ぶ', () => {
      const accountId = 'acc-456';
      const token = jwt.sign({ accountId }, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockRes();
      const next = mockNext();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect((req as unknown as { accountId: string }).accountId).toBe(accountId);
    });
  });

  describe('トークンなし', () => {
    it('Authorization ヘッダーがない場合は accountId なしで next を呼ぶ', () => {
      const req = mockReq({ headers: {} });
      const res = mockRes();
      const next = mockNext();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect((req as unknown as { accountId: unknown }).accountId).toBeUndefined();
    });
  });

  describe('不正なトークン', () => {
    it('トークンが不正な場合でも 401 を返さず accountId なしで next を呼ぶ', () => {
      const token = jwt.sign({ accountId: 'acc-123' }, 'wrong-secret');
      const req = mockReq({
        headers: { authorization: `Bearer ${token}` },
      });
      const res = mockRes();
      const next = mockNext();

      optionalAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect((req as unknown as { accountId: unknown }).accountId).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
