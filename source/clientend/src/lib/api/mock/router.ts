import type { SessionUser } from "@/types";
import { hasPermission } from "@/lib/auth/permissions";
import { ApiError } from "../errors";
import type { HttpMethod } from "../client";
import type { MockDb } from "./db";

export interface MockContext {
  db: MockDb;
  params: Record<string, string>;
  query: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Record<string, string>;
  user: SessionUser | null;
  /** Throws 401 when there is no session. */
  requireUser(): SessionUser;
  /** Throws 401/403 unless the session has every listed permission. */
  require(...permissions: string[]): SessionUser;
  /** Throws 401/403 unless the session has at least one of the listed permissions. */
  requireAny(...permissions: string[]): SessionUser;
}

export type MockHandler = (ctx: MockContext) => unknown | Promise<unknown>;

interface RouteDef {
  method: HttpMethod;
  pattern: RegExp;
  keys: string[];
  handler: MockHandler;
}

const routes: RouteDef[] = [];

/** Register a mock endpoint. Paths use Express-style params: /seller/products/:id */
export function route(method: HttpMethod, path: string, handler: MockHandler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" +
      path.replace(/\/:([A-Za-z_]+)/g, (_, key: string) => {
        keys.push(key);
        return "/([^/]+)";
      }) +
      "/?$",
  );
  routes.push({ method, pattern, keys, handler });
}

export function matchRoute(method: HttpMethod, path: string) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.pattern.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]!)));
    return { handler: r.handler, params };
  }
  return null;
}

export function makeContext(init: Omit<MockContext, "requireUser" | "require" | "requireAny">): MockContext {
  const ctx: MockContext = {
    ...init,
    requireUser() {
      if (!ctx.user) throw ApiError.unauthorized();
      return ctx.user;
    },
    require(...permissions) {
      const user = ctx.requireUser();
      if (!hasPermission(user.permissions, permissions, "all")) throw ApiError.forbidden();
      return user;
    },
    requireAny(...permissions) {
      const user = ctx.requireUser();
      if (!hasPermission(user.permissions, permissions, "any")) throw ApiError.forbidden();
      return user;
    },
  };
  return ctx;
}
