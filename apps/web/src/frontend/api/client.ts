"use client";

/**
 * The browser's side of the API.
 *
 * Everything goes through `api()`: same-origin, cookie-carrying, JSON in and
 * out, and errors turned into a real `ApiError` with the server's message so a
 * toast can just show it. The server's wording is written for the person
 * reading it ("That is more than the invoice is owed"), so passing it through
 * beats inventing a generic one here.
 */

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Off in Node (the store-flow tests drive the reducers directly, with no server
 * to talk to). Setting `__ERP_NO_API__` forces it off anywhere.
 */
export const apiEnabled = (): boolean =>
  typeof window !== "undefined" && !("__ERP_NO_API__" in globalThis);

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function api<T = unknown>(
  path: string,
  init: { method?: Method; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    // The session is an HttpOnly cookie; it has to ride along.
    credentials: "same-origin",
    headers: init.body === undefined ? {} : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: init.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const err = (payload ?? {}) as { error?: string; code?: string };
    throw new ApiError(
      err.error ?? `Request failed (${res.status})`,
      res.status,
      err.code ?? "request_failed",
    );
  }
  return payload as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body });
export const patch = <T>(path: string, body?: unknown) => api<T>(path, { method: "PATCH", body });
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
