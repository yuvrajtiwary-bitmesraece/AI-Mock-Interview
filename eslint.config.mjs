import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // ESLint 9 only lints .js/.mjs/.cjs by default; most components here are .jsx.
  { files: ["**/*.{js,jsx,mjs}"] },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
    },
  },
  {
    // Generated metadata images (next/og) can only use a plain <img>.
    // The Next.js plugin exempts these files itself on Linux but not on
    // Windows, so turn the rule off here to get the same result everywhere.
    files: ["app/**/{opengraph-image,twitter-image,icon,apple-icon}.{js,jsx}"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
