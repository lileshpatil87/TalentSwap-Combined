// ESLint configuration — apps/api
//
// Per Architecture Foundation §6.3: base config is meant to live in
// packages/config/eslint and be *extended*, not overridden, by each app.
// Until FOUND-02 (Shared Packages Skeleton) stands that package up, the
// equivalent rule set is inlined here; when packages/config/eslint exists,
// replace `extends` below with `require.resolve('@talentswap/config/eslint')`.
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules', 'coverage'],
  rules: {
    // --- Architecture Foundation §6.4: enforced 4-group import order ---
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          {
            pattern: '@talentswap/**',
            group: 'internal',
            position: 'before',
          },
          {
            pattern: '@app/**',
            group: 'internal',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],
    'import/no-cycle': 'error',

    // --- Architecture Foundation §6.2: relative imports only within a module's own tree ---
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../../../*'],
            message:
              'Deep relative imports crossing module boundaries are forbidden (Architecture Foundation §6.2). Use the @app/* alias instead.',
          },
        ],
      },
    ],

    // --- strictness (Architecture Foundation §6.1) ---
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-floating-promises': 'error',

    'prettier/prettier': 'error',
  },
  overrides: [
    {
      // supertest's `Response.body` (and, transitively, NestJS's
      // `app.getHttpServer()` in some @types combinations) is typed `any`
      // by design — it can't know the shape of an arbitrary HTTP
      // response body. That's expected and unavoidable in e2e specs
      // without hand-writing a response schema assertion for every call,
      // which isn't worth it for smoke tests. Relaxed here, scoped to
      // e2e spec files only — application source code keeps the full
      // strict ruleset. Found + added 2026-08-08 when `pnpm lint` was
      // actually run for the first time across the merged workspace.
      files: ['test/**/*.e2e-spec.ts', '**/*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
      },
    },
  ],
};
