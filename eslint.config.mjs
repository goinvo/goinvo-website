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
  {
    // STEGA GUARD. Sanity visual editing stega-encodes string field VALUES in the
    // Presentation preview, so a bare `field === 'literal'` is FALSE while editing
    // (and TRUE once published) — silently breaking any renderer/transform that
    // branches on a closed-set Sanity option field. Force such comparisons through
    // option() (src/lib/sanityOptions), which strips stega. Scoped to the content
    // render/transform areas; `size` is omitted because it collides with Map/Set.
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "BinaryExpression[operator=/^(===|!==)$/] > MemberExpression[property.name=/^(style|layout|variant|tone|columns|background|spacing|thumbnailSize)$/]",
          message:
            "Compare Sanity option fields through option() from '@/lib/sanityOptions' (e.g. option(block.style) === 'h4'). A bare `field === 'literal'` is FALSE in the Presentation preview because visual editing stega-encodes string values.",
        },
        {
          selector:
            "BinaryExpression[operator=/^(===|!==)$/] > ChainExpression > MemberExpression[property.name=/^(style|layout|variant|tone|columns|background|spacing|thumbnailSize)$/]",
          message:
            "Compare Sanity option fields through option() from '@/lib/sanityOptions' (e.g. option(block?.style) === 'h4'). A bare `field === 'literal'` is FALSE in the Presentation preview because visual editing stega-encodes string values.",
        },
      ],
    },
  },
]);

export default eslintConfig;
