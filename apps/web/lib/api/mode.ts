import { env } from "@/lib/env";
export function isNetworkFallbackEnabled(): boolean { return env.NEXT_PUBLIC_DEMO_FALLBACK === "true"; }
