import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper / ink palette — a digital Loeb
        paper: {
          DEFAULT: "#fbf7ef",
          card: "#fffdf8",
          deep: "#f3ebdc",
        },
        ink: {
          DEFAULT: "#211c15",
          soft: "#6b6051",
          faint: "#9b9081",
        },
        line: {
          DEFAULT: "#e7dfce",
          strong: "#d8cdb6",
        },
        // Oxblood accent, after the red Loeb (Latin) volumes
        accent: {
          DEFAULT: "#8a2b22",
          hover: "#73221b",
          soft: "#f3e6e2",
        },
        gold: "#b08a3e",
        // Warm dark mode
        night: {
          DEFAULT: "#16130f",
          card: "#211c16",
          line: "#352d23",
          ink: "#ece4d6",
          soft: "#a89c89",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
      boxShadow: {
        book: "0 30px 60px -25px rgba(33, 28, 21, 0.45)",
        card: "0 1px 2px rgba(33,28,21,0.04), 0 12px 30px -18px rgba(33,28,21,0.25)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease both",
      },
    },
  },
  plugins: [],
};
export default config;
