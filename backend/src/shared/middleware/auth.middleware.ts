import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ============================================================
// Extend Express Request type to include accountId
// ============================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      accountId?: string;
    }
  }
}

// ============================================================
// JWT payload type
// ============================================================

type JwtPayload = {
  accountId: string;
};

function isJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'accountId' in payload &&
    typeof (payload as { accountId: unknown }).accountId === 'string'
  );
}

// ============================================================
// Extract and verify token from request
// Returns accountId string or null
// ============================================================

function extractAccountId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const secret = process.env['JWT_SECRET'] ?? 'default-dev-secret';

  try {
    const decoded = jwt.verify(token, secret);
    if (isJwtPayload(decoded)) {
      return decoded.accountId;
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// requireAuth — 401 if no valid token
// ============================================================

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const accountId = extractAccountId(req);

  if (accountId === null) {
    res.status(401).json({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
    return;
  }

  req.accountId = accountId;
  next();
}

// ============================================================
// optionalAuth — proceeds without accountId if no/invalid token
// ============================================================

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const accountId = extractAccountId(req);

  if (accountId !== null) {
    req.accountId = accountId;
  }

  next();
}
