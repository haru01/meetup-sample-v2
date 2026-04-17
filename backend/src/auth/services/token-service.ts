/**
 * トークンサービスインターフェース
 */
export interface TokenService {
  generate(payload: { accountId: string }): string;
  verify(token: string): { accountId: string } | null;
}
