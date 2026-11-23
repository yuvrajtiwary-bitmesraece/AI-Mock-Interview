import defaultTheme from "tailwindcss/defaultTheme";

/** A theme colour from a CSS variable in app/globals.css, with opacity support. */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

/**
 * Tailwind theme for "Ember", the app's design system. Colours point at the
 * CSS variables in app/globals.css, so classes like bg-primary/15 work.
 *
 * @type {import("tailwindcss").Config}
 */
const config = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx,mdx}", "./components/**/*.{js,jsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        // The variables are set by next/font in app/layout.js.
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        serif: ["var(--font-serif)", ...defaultTheme.fontFamily.serif],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        success: token("success"),
        warning: token("warning"),
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        ember: { 1: token("ember-1"), 2: token("ember-2"), 3: token("ember-3") },
        chart: {
          1: token("chart-1"),
          2: token("chart-2"),
          3: token("chart-3"),
          4: token("chart-4"),
          5: token("chart-5"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // App screens and their parts: short, so a click feels instant.
        "page-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        // The level bars on the recording UI.
        wave: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "page-in": "page-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        float: "float 7s ease-in-out infinite",
        wave: "wave 1.2s ease-in-out infinite",
        glow: "glow 4s ease-in-out infinite",
      },
    },
  },
};

export default config;
