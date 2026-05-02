import { getToken } from "./token";

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: unknown };
type ApiResult<T> = ApiSuccess<T> | ApiFailure;

const buildHeaders = (
  extra: Record<string, string> = {},
): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const request = async <T>(
  path: string,
  options: RequestInit,
): Promise<ApiResult<T>> => {
  const response = await fetch(path, options);
  const data = await response.json();
  if (response.ok) {
    return { ok: true, data: data as T };
  }
  return { ok: false, error: data };
};

const get = <T>(path: string): Promise<ApiResult<T>> =>
  request<T>(path, {
    method: "GET",
    headers: buildHeaders(),
  });

const post = <T>(path: string, body: unknown): Promise<ApiResult<T>> =>
  request<T>(path, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

const patch = <T>(path: string, body: unknown): Promise<ApiResult<T>> =>
  request<T>(path, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

const put = <T>(path: string, body: unknown): Promise<ApiResult<T>> =>
  request<T>(path, {
    method: "PUT",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

const del = <T>(path: string): Promise<ApiResult<T>> =>
  request<T>(path, {
    method: "DELETE",
    headers: buildHeaders(),
  });

export const apiClient = {
  get,
  post,
  patch,
  put,
  delete: del,
};
