/**
 * Raw color token values. Consumed ONLY by apps/web/tailwind.config.ts's
 * theme.extend block (FE-CON §31) — no other file references these
 * directly. Everywhere else in the codebase uses the semantic CSS
 * variables / Tailwind classes these values back (FE-CON §32).
 *
 * Values are defined as HSL triplets (no `hsl()` wrapper) so they can be
 * consumed by Tailwind's `hsl(var(--x) / <alpha-value>)` pattern, which is
 * what makes shadcn/ui's opacity-modifier utilities (e.g. `bg-primary/50`)
 * work correctly.
 */

export const lightColors = {
  background: "0 0% 100%",
  foreground: "222 47% 11%",
  primary: "243 75% 59%",
  primaryForeground: "0 0% 100%",
  secondary: "210 40% 96%",
  secondaryForeground: "222 47% 11%",
  muted: "210 40% 96%",
  mutedForeground: "215 16% 47%",
  destructive: "0 72% 51%",
  destructiveForeground: "0 0% 100%",
  success: "142 71% 35%",
  successForeground: "0 0% 100%",
  warning: "38 92% 50%",
  warningForeground: "222 47% 11%",
  border: "214 32% 91%",
  ring: "243 75% 59%",
  // Domain-specific semantic colors — Arch §11.3
  points: "262 83% 58%",
  verified: "142 71% 35%",
  escrow: "38 92% 50%",
} as const;

export const darkColors = {
  background: "222 47% 8%",
  foreground: "210 40% 98%",
  primary: "243 75% 66%",
  primaryForeground: "222 47% 8%",
  secondary: "217 33% 17%",
  secondaryForeground: "210 40% 98%",
  muted: "217 33% 17%",
  mutedForeground: "215 20% 65%",
  destructive: "0 63% 60%",
  destructiveForeground: "210 40% 98%",
  success: "142 65% 45%",
  successForeground: "222 47% 8%",
  warning: "38 92% 60%",
  warningForeground: "222 47% 8%",
  border: "217 33% 20%",
  ring: "243 75% 66%",
  points: "262 83% 68%",
  verified: "142 65% 45%",
  escrow: "38 92% 60%",
} as const;

export type ColorToken = keyof typeof lightColors;
