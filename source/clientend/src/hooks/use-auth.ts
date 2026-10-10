"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useSessionStore } from "@/stores/session.store";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Logging out locally is enough if the API is unreachable.
    }
    useSessionStore.getState().clear();
    queryClient.clear();
    router.replace("/login");
  }, [router, queryClient]);
}
