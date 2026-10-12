import { env } from "@/lib/env";

/** Demo data is never a fallback in production, even if misconfigured. */
export function isNetworkFallbackEnabled(): boolean {
  return env.NEXT_PUBLIC_APP_ENV !== "production" && env.NEXT_PUBLIC_DEMO_FALLBACK === "true";
}
