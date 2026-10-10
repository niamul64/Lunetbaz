"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isApiError } from "@/lib/api/errors";
import { queryPolicy } from "@/lib/cache/query-policy";
import { useSessionStore } from "@/stores/session.store";
import { useCartStore } from "@/stores/cart.store";

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Background refetch failures shouldn't be silent when data is already on screen.
        if (query.state.data !== undefined && !(isApiError(error) && error.status === 401)) toast.error(error.message);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.options.meta?.silent) return;
        // Validation errors are shown inline by forms.
        if (isApiError(error) && error.code === "VALIDATION_FAILED" && mutation.options.meta?.inlineValidation) return;
        toast.error(error.message);
      },
    }),
    defaultOptions: {
      queries: {
        // Each query picks a tier from src/lib/cache/query-policy.ts; this is only the fallback.
        ...queryPolicy.private,
        refetchOnWindowFocus: false,
        retry: (count, error) => !(isApiError(error) && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silent?: boolean; inlineValidation?: boolean };
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => {
    void useSessionStore.persist.rehydrate();
    void useCartStore.persist.rehydrate();
  }, []);

  // Drop cached private data when the user signs out or switches accounts.
  useEffect(
    () =>
      useSessionStore.subscribe((state, prev) => {
        if (state.session?.user.id !== prev.session?.user.id) queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "store" });
      }),
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster richColors closeButton position="top-center" />
      </TooltipProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
