"use client";

import { NETWORK_MESSAGE, responseMessage } from "../shared/errors.ts";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.body === undefined ? "GET" : "POST"),
      headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch (error) {
    console.error("[LotScope]", url, error);
    throw new ApiError(NETWORK_MESSAGE, 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
  if (res.status === 401 && data?.code === "session" && typeof window !== "undefined") {
    window.location.replace(new URL("/login?error=session", window.location.origin).href);
  }
  if (!res.ok || !data || data.error) throw new ApiError(responseMessage(url, res.status, data), res.status);
  return data;
}
