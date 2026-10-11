import { PageContainer } from "@/components/ui/page-container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-segment loading fallback for everything under (admin)/admin
 * (Next.js App Router `loading.tsx` convention; FE-CON §25).
 */
export default function AdminLoading() {
  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </PageContainer>
  );
}
