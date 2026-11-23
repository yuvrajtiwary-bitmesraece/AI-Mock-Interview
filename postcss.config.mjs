// PostCSS runs Tailwind over app/globals.css; Next.js adds vendor prefixes itself.
const postcssConfig = {
  plugins: { tailwindcss: {} },
};

export default postcssConfig;
