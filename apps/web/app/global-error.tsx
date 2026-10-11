"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * Root-level error boundary (Next.js App Router `global-error.tsx`
 * convention — distinct from `error.tsx`; this one specifically catches
 * failures in the root layout itself, and therefore must render its own
 * complete `<html>`/`<body>`, bypassing `app/layout.tsx` entirely, per
 * FE-CON §51). Re-imports `globals.css` directly since the root layout
 * that normally imports it is exactly what may have failed — it must
 * not assume any provider (QueryClient, theme) is intact either.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center font-sans">
        <p className="text-sm font-medium text-muted-foreground">Error</p>
        <h1 className="text-3xl font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
