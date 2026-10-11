"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";
import { PageContainer } from "@/components/ui/page-container";

/**
 * Route-segment error boundary for everything under (admin)/admin
 * (Next.js App Router `error.tsx` convention; FE-CON §51).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO(FE-CON §52): report to Sentry once the monitoring module
    // wires it up.
    // eslint-disable-next-line no-console
    console.error("Admin route error:", error);
  }, [error]);

  return (
    <PageContainer>
      <ErrorState
        message="Something went wrong loading this page. Try again, or head back to the admin overview."
        retry={reset}
      />
    </PageContainer>
  );
}
