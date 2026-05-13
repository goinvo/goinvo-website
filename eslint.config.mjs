import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated/static migration artifacts; lint source and tests instead.
    "public/demos/**",
    "public/features/**",
    ".audit/**",
  ]),
  {
    rules: {
      // Content-heavy migrated pages contain prose with quotes/apostrophes.
      "react/no-unescaped-entities": "off",
      // Existing transition and live-preview components intentionally use refs/effects
      // in ways React Compiler lint treats conservatively. Keep type/tests as gates.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      // Static legacy ports sometimes use anchors inside copied article markup.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
