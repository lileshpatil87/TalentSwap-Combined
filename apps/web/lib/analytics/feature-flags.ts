import { apiRequest } from "@/lib/api";

export type FeatureFlagResult = { key: string; enabled: boolean; variant?: string | boolean | undefined };

/** Calls the authenticated backend adapter so PostHog configuration stays server-side. */
export function evaluateFeatureFlag(flagKey: string): Promise<FeatureFlagResult> {
  return apiRequest<FeatureFlagResult>(`/analytics/feature-flags/${encodeURIComponent(flagKey)}`);
}

export async function captureExperimentEvent(event: string, properties: Record<string, unknown> = {}): Promise<void> {
  await apiRequest<{ captured: boolean }>("/analytics/events", { method: "POST", body: { event, properties } });
}
