import type { Request, Response, NextFunction } from 'express';

// ============================================================
// OpenAPI Validator error shape
// ============================================================

type OpenApiValidationError = {
  status: number;
  errors: Array<{ message: string; path?: string }>;
};

function isOpenApiValidationError(err: unknown): err is OpenApiValidationError {
  if (typeof err !== 'object' || err === null) return false;
  if (!('status' in err)) return false;
  const status = (err as Record<string, unknown>).status;
  if (status !== 400 && status !== 422) return false;
  if (!('errors' in err)) return false;
  return Array.isArray((err as Record<string, unknown>).errors);
}

// ============================================================
// Error Handler Middleware
// ============================================================

export function errorHandlerMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isOpenApiValidationError(err)) {
    const messages = err.errors.map((e) => e.message).join('; ');
    res.status(err.status).json({
      code: 'VALIDATION_ERROR',
      message: messages,
    });
    return;
  }

  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  });
}
