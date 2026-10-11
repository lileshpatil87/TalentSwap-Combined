import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  message: string;
  retry?: () => void;
  className?: string;
}

/**
 * Shared error-state primitive (Arch §11.8, FE-CON §27), wired to
 * TanStack Query's `error`/`refetch`. Never a bare, unstyled "Something
 * went wrong" string with no recovery action (FE-CON §51).
 *
 * `message` should already be the output of `parseApiError()`
 * (lib/api.ts) — this component renders it, it doesn't parse it.
 */
export function ErrorState({ message, retry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
      <p className="max-w-sm text-sm text-foreground">{message}</p>
      {retry ? (
        <Button variant="outline" size="sm" onClick={retry} className="mt-2 gap-1.5">
          <RotateCw className="size-3.5" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
