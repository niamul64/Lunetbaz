import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/config/site";

/**
 * Optimistic route protection (runs before rendering). It only reads a hint
 * cookie – real authorization is always enforced by the API, and pages also
 * guard themselves on the client with the user's permissions.
 */
const PROTECTED: { prefix: string; portal: "admin" | "seller" | "store" }[] = [
  { prefix: "/admin", portal: "admin" },
  { prefix: "/seller", portal: "seller" },
  { prefix: "/account", portal: "store" },
  { prefix: "/checkout", portal: "store" },
];

function readHint(request: NextRequest): { portal: string; exp: number } | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const hint = JSON.parse(atob(raw));
    return hint.exp > Date.now() ? hint : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const rule = PROTECTED.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (!rule) return NextResponse.next();

  const hint = readHint(request);
  if (!hint) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  if (hint.portal !== rule.portal) {
    const home = hint.portal === "admin" ? "/admin" : hint.portal === "seller" ? "/seller" : "/";
    return NextResponse.redirect(new URL(home, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/seller/:path*", "/account/:path*", "/checkout/:path*"],
};
