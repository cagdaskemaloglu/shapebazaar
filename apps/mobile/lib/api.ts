import { supabase } from "./supabase";

export const WEB_BASE_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://www.shapebazaar.com").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  /** Sunucunun JSON yanıtı (ör. 409'da `code` ve `blockers`) */
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Web API'sine kimlik doğrulamalı POST (Authorization: Bearer <access_token>).
 * 401 gelirse oturumu yenileyip bir kez daha dener. Hata durumunda `ApiError` fırlatır.
 */
export async function apiPost<T = unknown>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ApiError("NO_SESSION", 401);

  const send = (accessToken: string) =>
    fetch(`${WEB_BASE_URL}${path}`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });

  let res = await send(session.access_token);
  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session) res = await send(refreshed.session.access_token);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json?.error ?? `HTTP_${res.status}`, res.status, json);
  return json as T;
}
