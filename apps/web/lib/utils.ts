import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts (e.g. `p-2 p-4` → `p-4`).
 * The standard shadcn/ui utility — every `components/ui/*` primitive and
 * feature component uses this instead of raw string concatenation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
