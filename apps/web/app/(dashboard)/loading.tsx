import { PageContainer } from "@/components/ui/page-container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-segment loading fallback for everything under (dashboard)
 * (Next.js App Router `loading.tsx` convention; FE-CON §25). Shown only
 * for the top-level segment transition — component-level loading inside
 * an already-rendered page uses the same <Skeleton> primitive directly.
 */
export default function DashboardLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
