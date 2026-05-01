import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/db",
                "**/db/**",
                "**/database",
                "**/database/**",
                "**/prisma",
                "**/prisma/**",
                "@prisma/client",
              ],
              message:
                "Do not import database clients into UI/client code. Use API routes, Server Components, or Server Actions as the boundary.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            "Avoid inline styles. Use shared components, Tailwind utilities, and globals.css variables instead.",
        },
        {
          selector:
            "Literal[value=/#[0-9a-fA-F]{3,8}/], TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Do not hard-code hex colors in TS/TSX. Add or reuse a CSS variable in app/globals.css.",
        },
      ],
    },
  },
  {
    files: ["app/**/page.tsx"],
    rules: {
      "max-lines": [
        "warn",
        {
          max: 90,
          skipBlankLines: true,
          skipComments: true,
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
  ]),
]);

export default eslintConfig;
