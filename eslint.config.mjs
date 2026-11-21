import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  // ESLint 9 only lints .js/.mjs/.cjs by default; most components here are .jsx.
  { files: ["**/*.{js,jsx,mjs}"] },
  ...nextCoreWebVitals,
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
