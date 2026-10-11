/**
 * @talentswap/utils — pure, framework-agnostic utility functions shared by
 * apps/web and apps/api (Arch §2.3). No NestJS decorators, no React
 * components — importable from either a Node server or a browser bundle.
 *
 * Domain-specific formatters (e.g. points/ledger formatting) are added by
 * the owning domain module (`wallet`) in its own PR — not shipped here.
 */

export * from "./date";
export * from "./pagination";
