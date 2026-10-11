/**
 * Spacing scale — Tailwind's default 4px base scale, adopted as-is per
 * Architecture Foundation §11.1. Restated here (rather than left implicit)
 * so `tailwind.config.ts` has a single, explicit source to extend from,
 * consistent with how colors/typography are sourced (FE-CON §31).
 */
export const spacingScale = {
  0: "0px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  6: "1.5rem",
  8: "2rem",
  12: "3rem",
  16: "4rem",
  24: "6rem",
} as const;

export type SpacingToken = keyof typeof spacingScale;
