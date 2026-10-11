import * as React from "react";

import { cn } from "@/lib/utils";

export type PageContainerProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Consistent content-area wrapper for every route rendered inside the
 * shell (FE-CON §8/§34). Establishes the platform's one max-width +
 * padding rhythm so every future feature page composes the same
 * container instead of each module re-deriving its own spacing
 * (Arch §10.2 DRY — this is exactly the kind of shared, non-business
 * layout primitive `components/ui/` exists for, FE-CON §9).
 */
function PageContainer({ className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)}
      {...props}
    />
  );
}

export { PageContainer };
