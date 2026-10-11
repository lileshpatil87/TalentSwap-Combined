"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";

/**
 * Route-segment error boundary for everything under (dashboard) (Next.js
 * App Router `error.tsx` convention; FE-CON §51). Catches render-time
 * failures in any dashboard route without crashing the whole app shell —
 * Sidebar/Navbar continue to render since this boundary is scoped to
 * `{children}` inside the (dashboard) layout, not the layout itself.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(FE-CON §52): report to Sentry once the monitoring module
    // wires it up. Never silently swallowed in the meantime — surfaced
    // to the console with enough context to trace during development.
    // eslint-disable-next-line no-console
    console.error("Dashboard route error:", error);
  }, [error]);

  return (
    <PageContainer>
      <ErrorState
        message="Something went wrong loading this page. Try again, or head back to your dashboard."
        retry={reset}
      />
    </PageContainer>
  );
}
