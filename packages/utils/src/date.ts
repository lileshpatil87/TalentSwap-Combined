/**
 * Pure, framework-agnostic date helpers shared by apps/web and apps/api.
 * No side effects, no DOM/Node-specific APIs — importable from either a
 * Node server or a browser bundle without polyfills (Arch §2.3).
 */

/** Formats an ISO timestamp as a short, locale-aware date string. */
export function formatDate(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/** Formats an ISO timestamp as a locale-aware date + time string. */
export function formatDateTime(iso: string, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Returns a coarse "time ago" string (e.g. "3h ago", "2d ago"). */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);

  const thresholds: Array<[number, string, number]> = [
    [60, "s", 1],
    [3600, "m", 60],
    [86400, "h", 3600],
    [2592000, "d", 86400],
  ];

  for (const [limit, unit, divisor] of thresholds) {
    if (diffSec < limit) {
      const value = Math.max(1, Math.floor(diffSec / divisor));
      return `${value}${unit} ago`;
    }
  }

  return formatDate(iso);
}
