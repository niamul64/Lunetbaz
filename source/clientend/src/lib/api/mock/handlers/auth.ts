import type { AuthSession, DemoAccount } from "@/types";
import { ApiError } from "../../errors";
import { route } from "../router";
import { encodeToken, newId, nowIso, toSessionUser } from "../helpers";

route("POST", "/auth/login", ({ db, body }) => {
  const identifier = String(body?.identifier ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const user = db.users.find((u) => u.email.toLowerCase() === identifier || u.phone === identifier);
  const expected = user?.password ?? db.demoPassword;
  if (!user || password !== expected) throw new ApiError(401, "INVALID_CREDENTIALS", "Incorrect email/phone or password.");
  if (user.status === "suspended") throw new ApiError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Please contact support.");
  if (user.status === "invited") throw new ApiError(403, "ACCOUNT_NOT_ACTIVATED", "Please accept your invitation before signing in.");
  const { token, expiresAt } = encodeToken(user.id);
  return { accessToken: token, expiresAt, user: toSessionUser(db, user) } satisfies AuthSession;
});

route("POST", "/auth/register", ({ db, body }) => {
  const name = String(body?.name ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const fieldErrors: Record<string, string> = {};
  if (db.users.some((u) => u.phone === phone)) fieldErrors.phone = "An account with this phone number already exists.";
  if (email && db.users.some((u) => u.email.toLowerCase() === email)) fieldErrors.email = "An account with this email already exists.";
  if (Object.keys(fieldErrors).length) throw ApiError.validation("Please fix the highlighted fields.", fieldErrors);

  const user = { id: newId("u"), name, phone, email, password, role: "customer" as const, shopId: null, status: "active" as const, createdAt: nowIso() };
  db.users.push(user);
  const { token, expiresAt } = encodeToken(user.id);
  return { accessToken: token, expiresAt, user: toSessionUser(db, user) } satisfies AuthSession;
});

route("POST", "/auth/logout", () => ({ ok: true }));

route("GET", "/auth/me", (ctx) => ctx.requireUser());

/** Mock-only helper for the login screen's "demo accounts" picker. */
route("GET", "/auth/demo-accounts", ({ db }) =>
  db.users
    .filter((u) => u.status === "active" && !u.password)
    .map((u) => {
      const role = db.roles.find((r) => r.key === u.role)!;
      return { email: u.email, name: u.name, role: u.role, roleLabel: role.label, portal: role.portal, description: role.description } satisfies DemoAccount;
    }),
);
