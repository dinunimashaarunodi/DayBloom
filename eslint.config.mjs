import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const DATE_RULE_MESSAGE =
  "Don't derive calendar days from ISO strings: that gives the UTC day, not the user's. Use todayIn()/toLocalDate() from @/lib/dates/local-date."

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Date rules from CLAUDE.md, enforced.
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^(slice|substring|substr|split)$/][callee.object.callee.property.name='toISOString']",
          message: DATE_RULE_MESSAGE,
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["date-fns", "@date-fns/*", "dayjs", "moment*", "luxon"],
              message:
                "Date and timezone logic lives only in src/lib/dates (built on Intl). Import a helper from there instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/dates/**"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
])

export default eslintConfig
