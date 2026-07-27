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
    // Prisma-generated client (not hand-written).
    "src/backend/database/generated/**",
    // Stray "<name> 2.ext" copies left behind by file-sync tools — not routed,
    // not imported, and byte-identical to the real files next to them.
    "**/* 2.*",
  ]),
]);

export default eslintConfig;
