import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f4f1ea",
        panel: "#fffcf7",
        line: "#ddd6c8",
        paper: "#0e1116",
        muted: "#5c5a56",
        coral: "#ff5b2e",
        signal: "#0f7a55",
        warn: "#d97706",
        crit: "#dc2626",
        tide: "#2b4cff",
        rail: "#0e1116",
        "rail-fg": "#c8c4bc",
        "rail-accent": "#1a1f28",
        "rail-line": "#252b36",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui"],
        display: ["Fraunces", "IBM Plex Sans", "ui-serif", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
