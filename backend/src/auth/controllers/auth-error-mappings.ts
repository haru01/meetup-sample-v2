import type { RegisterAccountError, LoginError } from '../errors/auth-errors';
import type { ErrorResponse } from '@shared/controllers/error-response';

// ============================================================
// 認証エラー → HTTP レスポンス マッピング
// ============================================================

/**
 * アカウント登録エラーをHTTPレスポンスにマッピングする
 */
export function mapRegisterAccountErrorToResponse(error: RegisterAccountError): ErrorResponse {
  switch (error.type) {
    case 'DuplicateEmail':
      return {
        status: 409,
        response: {
          code: 'DUPLICATE_EMAIL',
          message: `このメールアドレスは既に登録されています: ${error.email}`,
        },
      };
  }
}

/**
 * ログインエラーをHTTPレスポンスにマッピングする
 */
export function mapLoginErrorToResponse(error: LoginError): ErrorResponse {
  switch (error.type) {
    case 'InvalidCredentials':
      return {
        status: 401,
        response: {
          code: 'INVALID_CREDENTIALS',
          message: 'メールアドレスまたはパスワードが正しくありません',
        },
      };
  }
}
