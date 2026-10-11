"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { PwaRegister } from "@/components/pwa-register";

/**
 * Root-level client providers, composed once in app/layout.tsx.
 *
 * Owns only global providers — no route-specific UI, no feature/business
 * logic (Constitution §7). Server state lives in TanStack Query
 * exclusively (FE-CON §21.2); theme is owned by next-themes' class
 * strategy (Arch §11.5 / FE-CON §42).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Created once per browser session via useState's lazy initializer, so
  // the QueryClient survives re-renders but not full page reloads —
  // the standard TanStack Query + Next.js App Router pattern.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Sensible platform-wide default; individual modules tune
            // staleTime per query key based on data volatility
            // (FE-CON §43 — a leaderboard differs from a live chat feed).
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <><div>{children}</div><PwaRegister /></>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
