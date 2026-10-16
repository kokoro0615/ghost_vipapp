import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// package.json overrides alias @next/eslint-plugin-next's fast-glob to
// tinyglobby (drops the vulnerable braces/micromatch chain). That is only a
// safe drop-in while settings.next.rootDir stays unset: tinyglobby expands
// directory globs differently. Revisit the override before setting rootDir.
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", ".vercel/**", "next-env.d.ts"]),
]);
