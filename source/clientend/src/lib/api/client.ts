import { env } from "@/config/env";
import { toQueryString } from "@/lib/utils";
import { ApiError } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Optional per-request token, e.g. on the server. Defaults to the browser session token. */
  token?: string | null;
}

export interface Transport {
  request<T>(method: HttpMethod, path: string, options: RequestOptions): Promise<T>;
}

/* ----------------------------------------------------------------------------
 * Session hooks – registered by the session store so the API layer stays
 * independent of React/Zustand.
 * -------------------------------------------------------------------------- */

let getToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApiAuth(opts: { getToken: () => string | null; onUnauthorized: () => void }) {
  getToken = opts.getToken;
  onUnauthorized = opts.onUnauthorized;
}

/* ----------------------------------------------------------------------------
 * HTTP transport – talks to the NestJS backend.
 * -------------------------------------------------------------------------- */

const httpTransport: Transport = {
  async request<T>(method: HttpMethod, path: string, options: RequestOptions): Promise<T> {
    const token = options.token;
    const headers: Record<string, string> = { Accept: "application/json", ...options.headers };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${env.apiBaseUrl}${path}${toQueryString(options.query)}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        credentials: "include",
        // In the browser TanStack Query owns caching; don't let the HTTP cache keep a second,
        // uncontrolled copy of user-specific responses. (On the server, "use cache" decides.)
        ...(typeof window !== "undefined" && { cache: "no-store" as const }),
        signal: options.signal,
      });
    } catch (cause) {
      if ((cause as Error).name === "AbortError") throw cause;
      throw new ApiError(0, "NETWORK_ERROR", "Can't reach Lunetbuz right now. Check your connection and try again.");
    }

    if (res.status === 204) return undefined as T;
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      const err = payload?.error ?? {};
      throw new ApiError(res.status, err.code ?? `HTTP_${res.status}`, err.message ?? res.statusText, err.details);
    }
    return payload as T;
  },
};

/* ----------------------------------------------------------------------------
 * Transport selection. The mock transport (and the dummy data it bundles) is
 * loaded lazily so it never ships in an "http" build's main chunk.
 * -------------------------------------------------------------------------- */

let transportPromise: Promise<Transport> | null = null;

function resolveTransport(): Promise<Transport> {
  if (!transportPromise) {
    transportPromise =
      env.apiMode === "mock" ? import("./mock").then((m) => m.mockTransport) : Promise.resolve(httpTransport);
  }
  return transportPromise;
}

async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const transport = await resolveTransport();
  const usesSessionToken = options.token === undefined;
  const token = usesSessionToken ? getToken() : options.token;
  try {
    return await transport.request<T>(method, path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && usesSessionToken && token) onUnauthorized();
    throw error;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};
