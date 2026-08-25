import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        sunken: "var(--sunken)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        ink3: "var(--ink-3)",
        rule: "var(--rule)",
        ruleSoft: "var(--rule-soft)",
        brass: "var(--brass)",
        brassInk: "var(--brass-ink)",
        brassSoft: "var(--brass-soft)",
        down: "var(--down)",
        downSoft: "var(--down-soft)",
        up: "var(--up)",
        upSoft: "var(--up-soft)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
