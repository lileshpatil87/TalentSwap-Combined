"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/ui/error-state";

/**
 * Root-segment error boundary (Next.js App Router `error.tsx`
 * convention). Catches any render-time failure not already caught by a
 * more specific route-group boundary — e.g. inside (public), which does
 * not define its own `error.tsx` (FE-CON §51). Rendered inside the
 * intact root layout (Providers, fonts, globals.css), unlike
 * `global-error.tsx`, which replaces the root layout entirely.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <ErrorState message="Something went wrong. Please try again." retry={reset} className="max-w-md" />
    </div>
  );
}
