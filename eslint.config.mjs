// Flat ESLint config shared across all workspace packages.
// pnpm puts the workspace-root node_modules/.bin on PATH for package scripts,
// so each package's `eslint src` resolves this config + the root-installed eslint.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/out/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "defi-risk-agg-poc-design/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // Pragmatic for a POC: the no-composite invariant is enforced by
      // validateDataset + tests, not lint. Keep lint useful but non-blocking on style.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
);
