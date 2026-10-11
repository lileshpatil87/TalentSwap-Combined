/**
 * Fixed semantic typography scale — Architecture Foundation §11.2,
 * Frontend Constitution §33. These seven roles are exhaustive for launch
 * scope; a component needing an eighth role raises a token addition
 * rather than reaching for an arbitrary one-off size.
 */
export const typographyScale = {
  display: { className: "text-4xl md:text-5xl font-bold", use: "Landing page hero only" },
  "heading-1": { className: "text-3xl font-semibold", use: "Page titles" },
  "heading-2": { className: "text-xl font-semibold", use: "Section headers" },
  "heading-3": { className: "text-lg font-medium", use: "Card titles" },
  body: { className: "text-base", use: "Default paragraph/UI text" },
  "body-sm": { className: "text-sm", use: "Secondary text, metadata" },
  caption: { className: "text-xs text-muted-foreground", use: "Timestamps, helper text" },
} as const;

export type TypographyRole = keyof typeof typographyScale;

export const fontFamily = {
  sans: ["var(--font-sans)", "system-ui", "sans-serif"],
} as const;
