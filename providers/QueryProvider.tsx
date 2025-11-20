"use client";

/** Provides a single React Query client instance to the app. */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Treat cached data as fresh for 3 minutes.
            staleTime: 3 * 60 * 1000,

            // Remove inactive queries after 5 minutes in cache.
            gcTime: 5 * 60 * 1000,

            retry: 1,

            refetchOnWindowFocus: true,

            refetchOnMount: false,

            refetchOnReconnect: false,
          },
          mutations: {
            retry: 1,

            onError: (error) => {
              console.error("Mutation Error:", error);
              // TODO: Add toast notification system
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only show in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
