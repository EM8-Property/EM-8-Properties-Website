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

const PHYSICAL_STYLE_MESSAGE =
  "Use logical CSS properties in inline styles: marginInlineStart/End, " +
  "paddingInlineStart/End, borderInlineStart/End, insetInlineStart/End, and " +
  "textAlign: 'start'|'end'. Phase 2 mirrors this layout for Hebrew.";

const COLOR_LITERAL = "#[0-9a-fA-F]{3,8}\\b|rgba?\\(";
const COLOR_LITERAL_MESSAGE =
  "Colour literals belong in src/lib/tokens.ts (or chipColors.ts), not in a " +
  "component. The dark re-theme is a token swap, and a swap only moves what is in " +
  "the palette. Use a token class (text-danger, bg-teal-hover, border-field-border) " +
  "or an opacity modifier on one (bg-ink/55).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // Not scoped to className attributes.
        //
        // The earlier version required a `JSXAttribute[name.name='className']` ancestor,
        // which made it blind to exactly how this codebase actually writes classes:
        // `const inputClass = '...'` in LeadForm, the `const button = (isActive) =>
        // [...].join(' ')` helpers in PortfolioFilter and InsightsFilter, `const base` /
        // `const style` in Button. Every one of those would have sailed past it. The
        // rule that decides whether Phase 2 is additive or a rewrite cannot have a hole
        // shaped like the prevailing pattern.
        //
        // Cost: prose containing "left" or "right" in a string may trip it. That is a
        // one-line eslint-disable, and cheap against a Phase 2 rewrite.
        {
          selector: `Literal[value=/${PHYSICAL_DIRECTION}/]`,
          message: LOGICAL_PROPERTIES_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${PHYSICAL_DIRECTION}/]`,
          message: LOGICAL_PROPERTIES_MESSAGE,
        },
        // Inline styles bypass Tailwind entirely, so they need their own guard.
        {
          selector:
            "JSXAttribute[name.name='style'] Property[key.name=/^(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight|left|right)$/]",
          message: PHYSICAL_STYLE_MESSAGE,
        },
        {
          selector:
            "JSXAttribute[name.name='style'] Property[key.name='textAlign'][value.value=/^(left|right)$/]",
          message: PHYSICAL_STYLE_MESSAGE,
        },
        // Added 2026-09-08. Seven colour decisions were living as Tailwind arbitrary
        // values and inline styles across eleven files, so the palette was not actually
        // centralized and a token swap would have missed all of them — including
        // LeadForm's error text, which measures 3.20:1 on a dark ground.
        //
        // Same shape as the logical-properties rule above and for the same reason: the
        // guard has to see how this codebase really writes classes, which is often in a
        // variable rather than in a className attribute.
        //
        // Cost: strings containing "#" followed by digits, like "Unit #204" or "Suite #100",
        // may trip it (digits are valid hex characters). The pattern cannot distinguish them from
        // valid CSS shorthand colours like #204. Escape hatch: a one-line eslint-disable on that
        // string, cheap against a token swap that would otherwise miss a colour.
        {
          selector: `Literal[value=/${COLOR_LITERAL}/]`,
          message: COLOR_LITERAL_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${COLOR_LITERAL}/]`,
          message: COLOR_LITERAL_MESSAGE,
        },
      ],
    },
  },
  {
    /*
     * The palette's own home, and the boundary that renders without it.
     *
     * tokens.ts and chipColors.ts ARE the centralized palette — the rule exists to push
     * colours into them. global-error.tsx is the error boundary that renders when the
     * stylesheet has failed to load, so its colours have to be inline: a token it cannot
     * resolve is a black page.
     */
    files: ["src/lib/tokens.ts", "src/lib/chipColors.ts", "src/app/global-error.tsx"],
    rules: { "no-restricted-syntax": "off" },
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
