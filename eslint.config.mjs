import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * Physical-direction Tailwind utilities, banned in favour of their logical equivalents.
 *
 * Phase 2 adds Hebrew and mirrors the entire layout. Logical properties are what make
 * that additive instead of a rewrite, so the rule is enforced by the linter across every
 * file rather than by a single assertion in one component's test.
 *
 *   ml-/mr-  -> ms-/me-        pl-/pr-        -> ps-/pe-
 *   left-/right- -> start-/end-  text-left/right -> text-start/end
 *   border-l/r -> border-s/e     rounded-l/r     -> rounded-s/e
 *
 * Matches a whole class token, allows variant prefixes (`sm:`, `hover:`, `group-hover:`)
 * and a leading `-` for negative values. `rounded-lg` and `prose` do not match: the token
 * must end at a `-` boundary or whitespace.
 */
const PHYSICAL_DIRECTION =
  /(?:^|\s)(?:[a-z0-9_-]+:)*-?(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|inset-l|inset-r|text-left|text-right|float-left|float-right)(?:-[^\s]*)?(?=\s|$)/
    .source;

const LOGICAL_PROPERTIES_MESSAGE =
  "Use CSS logical properties: ms-/me- not ml-/mr-, ps-/pe- not pl-/pr-, " +
  "start-/end- not left-/right-, text-start/text-end not text-left/text-right, " +
  "border-s/border-e not border-l/border-r. Phase 2 mirrors this layout for Hebrew.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `JSXAttribute[name.name='className'] Literal[value=/${PHYSICAL_DIRECTION}/]`,
          message: LOGICAL_PROPERTIES_MESSAGE,
        },
        {
          selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${PHYSICAL_DIRECTION}/]`,
          message: LOGICAL_PROPERTIES_MESSAGE,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // ESLint's flat config does not read .gitignore, so build output has to be listed
    // here as well. `dist/` is the Sanity Studio bundle produced by scripts/deploy-studio.sh
    // and `.sanity/` its local runtime cache — linting either floods the run with errors
    // from minified vendor code and fails CI.
    "dist/**",
    ".sanity/**",
  ]),
]);

export default eslintConfig;
