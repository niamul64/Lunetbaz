/**
 * Mock transport: resolves API calls against /dummy_data instead of the network.
 * Every endpoint path here is the real backend path, so switching to the NestJS
 * API is a configuration change (NEXT_PUBLIC_API_MODE=http).
 */
import { env } from "@/config/env";
import { ApiError } from "../errors";
import type { Transport } from "../client";
import { getDb, persistDb } from "./db";
import { makeContext, matchRoute } from "./router";
import { decodeToken, toSessionUser } from "./helpers";

import "./handlers/auth";
import "./handlers/store";
import "./handlers/account";
import "./handlers/seller";
import "./handlers/admin-core";
import "./handlers/admin-ops";

const isBrowser = typeof window !== "undefined";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeQuery(query: Record<string, unknown> | undefined) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    out[k] = v === true ? "1" : Array.isArray(v) ? v.join(",") : String(v);
  }
  return out;
}

export const mockTransport: Transport = {
  async request<T>(method: Parameters<Transport["request"]>[0], path: string, options: Parameters<Transport["request"]>[2]): Promise<T> {
    // Simulate network latency in the browser only, so SSR stays fast.
    if (isBrowser && env.mockLatencyMs > 0) await sleep(env.mockLatencyMs * (0.6 + Math.random() * 0.8));

    const cleanPath = path.split("?")[0]!;
    const match = matchRoute(method, cleanPath);
    if (!match) throw new ApiError(404, "ROUTE_NOT_FOUND", `Mock route not implemented: ${method} ${cleanPath}`);

    const db = getDb();
    const claims = decodeToken(options.token);
    const userRecord = claims ? db.users.find((u) => u.id === claims.sub && u.status === "active") : undefined;
    if (options.token && !userRecord) throw ApiError.unauthorized("Your session has expired. Please sign in again.");

    const ctx = makeContext({
      db,
      params: match.params,
      query: normalizeQuery(options.query),
      body: options.body === undefined ? undefined : structuredClone(options.body),
      headers: options.headers ?? {},
      user: userRecord ? toSessionUser(db, userRecord) : null,
    });

    const result = await match.handler(ctx);
    if (method !== "GET") persistDb();
    // Never hand out references to the in-memory db.
    return (result === undefined ? undefined : structuredClone(result)) as T;
  },
};

export { resetDb } from "./db";
