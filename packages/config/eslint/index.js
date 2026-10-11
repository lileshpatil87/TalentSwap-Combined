/**
 * Shared base ESLint configuration.
 *
 * Extended (never overridden) by every app and package per
 * Architecture Foundation §6.3 and Frontend Constitution §4/§18.
 *
 * App-specific configs layer on top of this:
 *   - apps/web/.eslintrc.json adds `next/core-web-vitals` + `eslint-plugin-react-hooks`
 *   - apps/api/.eslintrc.js (future) adds `@nestjs/eslint-plugin` conventions
 */
module.exports = {
  root: false,
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    // `plugin:@typescript-eslint/recommended-requiring-type-checking`
    // (extended above) needs real type information, which requires
    // `project` to point at a tsconfig.json. Found missing 2026-08-08:
    // linting any app that extends this shared config (e.g. `next lint`
    // in apps/web) failed outright with "you have used a rule which
    // requires type information, but don't have parserOptions set to
    // generate type information" — this config enabled the rules but
    // never wired the project.
    //
    // `project: true` (supported since @typescript-eslint v5.21) makes
    // each linted file resolve its own nearest tsconfig.json rather than
    // hardcoding one path here, which wouldn't work across multiple
    // consuming apps. `tsconfigRootDir: process.cwd()` anchors that
    // search at the directory ESLint was invoked from — correct for both
    // `next lint` (cwd = apps/web) and `eslint` run from apps/api's own
    // package script (cwd = apps/api).
    project: true,
    tsconfigRootDir: process.cwd(),
  },
  env: {
    es2022: true,
    node: true,
  },
  rules: {
    // Import ordering — Arch §6.4 / FE-CON §18. Four groups: external,
    // workspace packages, internal alias, relative (same module only).
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling", "index"],
        ],
        pathGroups: [
          {
            pattern: "@talentswap/**",
            group: "internal",
            position: "before",
          },
        ],
        pathGroupsExcludedImportTypes: ["builtin"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "import/no-cycle": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            // Module-boundary rule — Arch §6.2 / FE-CON §20: relative imports
            // may not climb out of a module's own folder tree.
            group: ["../../*"],
            message:
              "Relative imports may not cross a module boundary. Use the @/* or @talentswap/* alias instead (see FE-CON-v1.0 §20).",
          },
        ],
      },
    ],
  },
  ignorePatterns: ["dist", ".next", "node_modules", "coverage"],
};
