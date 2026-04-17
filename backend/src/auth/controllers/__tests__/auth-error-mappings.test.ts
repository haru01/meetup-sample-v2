import { describe, it, expect } from 'vitest';
import { mapRegisterAccountErrorToResponse, mapLoginErrorToResponse } from '../auth-error-mappings';

describe('mapRegisterAccountErrorToResponse', () => {
  it('DuplicateEmail は 409 DUPLICATE_EMAIL を返し、メッセージに email を含む', () => {
    const result = mapRegisterAccountErrorToResponse({
      type: 'DuplicateEmail',
      email: 'taro@example.com',
    });

    expect(result).toEqual({
      status: 409,
      response: {
        code: 'DUPLICATE_EMAIL',
        message: 'このメールアドレスは既に登録されています: taro@example.com',
      },
    });
  });
});

describe('mapLoginErrorToResponse', () => {
  it('InvalidCredentials は 401 INVALID_CREDENTIALS を返す', () => {
    const result = mapLoginErrorToResponse({ type: 'InvalidCredentials' });

    expect(result).toEqual({
      status: 401,
      response: {
        code: 'INVALID_CREDENTIALS',
        message: 'メールアドレスまたはパスワードが正しくありません',
      },
    });
  });
});
