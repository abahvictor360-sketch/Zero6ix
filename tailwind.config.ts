import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      fontFamily: { sans: ["var(--font-jakarta)", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#effaf3", 100: "#d8f3e2", 200: "#b3e6c8", 300: "#7fd2a6",
          400: "#48b77f", 500: "#259b63", 600: "#177c4e", 700: "#136341",
          800: "#124f36", 900: "#0f3f2d", 950: "#072a1d",
        },
        lime: { 300: "#dcfb7a", 400: "#cdf548", 500: "#b8e62a" },
      },
      borderRadius: { "4xl": "2rem" },
      boxShadow: { card: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(16,24,40,.12)" },
    },
  },
  plugins: [forms],
};
export default config;
