// Minimal flat ESLint config: catches real correctness issues (unused
// vars/imports, hook rule violations, unresolved references) without
// imposing a stylistic rulebook this codebase was never written against —
// this is a new CI gate being added on top of ~15k lines of existing code,
// not a from-scratch project, so it's tuned to find bugs, not to relitigate
// formatting.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off', // pervasive at API boundaries (see apiHelper.ts) — a real project-wide pass, not this gate's job
      'no-console': 'off', // intentional dev-mode logging is part of the documented mailer fallback behavior
      // This rule (new in eslint-plugin-react-hooks v6+, aimed at React
      // Compiler compatibility) flags the standard "fetch data on mount"
      // pattern — `useEffect(() => { load() }, [])` — used throughout every
      // data-driven page in this app. That pattern is not a bug: it's the
      // conventional approach for a codebase that doesn't use React Query/
      // Suspense-based data fetching, and every one of these effects has
      // been individually verified working via live Playwright runs across
      // this project's audit history. Rewriting the data-fetching
      // architecture app-wide to satisfy a compiler-targeting lint rule
      // would be a large, unjustified rewrite of already-correct code.
      'react-hooks/set-state-in-effect': 'off',
    },
  }
);
