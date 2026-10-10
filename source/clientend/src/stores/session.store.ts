"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { SESSION_COOKIE } from "@/config/site";
import { configureApiAuth } from "@/lib/api/client";
import type { AuthSession, Portal, SessionUser } from "@/types";

/**
 * Client session. In mock mode the access token lives in localStorage.
 * With the real backend, prefer an httpOnly refresh cookie set by the API and
 * keep only the short-lived access token here (see README → Authentication).
 */
interface SessionState {
  session: AuthSession | null;
  hydrated: boolean;
  setSession: (session: AuthSession) => void;
  updateUser: (patch: Partial<SessionUser>) => void;
  clear: () => void;
}

/** Non-sensitive hint cookie so proxy.ts can redirect before rendering protected portals. */
function writeHintCookie(session: AuthSession | null) {
  if (typeof document === "undefined") return;
  if (!session) {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const hint = btoa(JSON.stringify({ portal: session.user.portal, exp: new Date(session.expiresAt).getTime() }));
  const maxAge = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
  document.cookie = `${SESSION_COOKIE}=${hint}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (session) => {
        writeHintCookie(session);
        set({ session });
      },
      updateUser: (patch) => set((s) => (s.session ? { session: { ...s.session, user: { ...s.session.user, ...patch } } } : s)),
      clear: () => {
        writeHintCookie(null);
        set({ session: null });
      },
    }),
    {
      name: "lunetbuz.session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ session: s.session }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state?.session && new Date(state.session.expiresAt).getTime() < Date.now()) state.clear();
        else writeHintCookie(state?.session ?? null);
        useSessionStore.setState({ hydrated: true });
      },
    },
  ),
);

configureApiAuth({
  getToken: () => useSessionStore.getState().session?.accessToken ?? null,
  onUnauthorized: () => useSessionStore.getState().clear(),
});

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export function useSession() {
  const session = useSessionStore((s) => s.session);
  const hydrated = useSessionStore((s) => s.hydrated);
  const status: SessionStatus = !hydrated ? "loading" : session ? "authenticated" : "unauthenticated";
  return { session, user: session?.user ?? null, status };
}

export function portalHome(portal: Portal) {
  return portal === "admin" ? "/admin" : portal === "seller" ? "/seller" : "/";
}
