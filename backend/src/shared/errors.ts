// ============================================================
// Shared Error Types
// ============================================================

/**
 * Resource not found error
 */
export type NotFoundError = {
  readonly type: 'NotFound';
  readonly message: string;
};

/**
 * Validation error
 */
export type ValidationError = {
  readonly type: 'ValidationError';
  readonly message: string;
};

/**
 * Conflict error (e.g. duplicate resource)
 */
export type ConflictError = {
  readonly type: 'Conflict';
  readonly message: string;
};

/**
 * Unauthorized error
 */
export type UnauthorizedError = {
  readonly type: 'Unauthorized';
  readonly message: string;
};

/**
 * Forbidden error
 */
export type ForbiddenError = {
  readonly type: 'Forbidden';
  readonly message: string;
};

/**
 * Internal (unexpected) error
 */
export type InternalError = {
  readonly type: 'InternalError';
  readonly message: string;
};

/**
 * ID 文字列のフォーマット不正（UUID ではない等）。
 * UseCase 内で throw せず Result.err として扱う目的で定義。
 */
export type InvalidIdFormatError = {
  readonly type: 'InvalidIdFormat';
  readonly field: string;
  readonly value: string;
};

/**
 * Union of all shared error types
 */
export type SharedError =
  | NotFoundError
  | ValidationError
  | ConflictError
  | UnauthorizedError
  | ForbiddenError
  | InternalError
  | InvalidIdFormatError;
