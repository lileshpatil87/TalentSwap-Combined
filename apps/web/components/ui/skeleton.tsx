import { cn } from "@/lib/utils";

/**
 * Base skeleton shape. Feature modules compose this into
 * `<ComponentName>Skeleton` variants matching their real component's
 * layout (FE-CON §26) — e.g. `TransactionCardSkeleton`. This foundation
 * module ships only the primitive, not any feature-specific skeleton.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-skeleton-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
