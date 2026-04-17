// ============================================================
// Controller layer common error response type
// ============================================================

export type ErrorResponse = {
  status: number;
  response: { code: string; message: string };
};
