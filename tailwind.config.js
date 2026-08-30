/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Core surfaces — neutral charcoal, no blue tint ──
        ink: "#111114",              // deepest background
        panel: "#16161a",            // card / sidebar surface
        "panel-2": "#1a1a1f",        // elevated surface (inputs, badges)
        line: "rgba(255,255,255,0.06)", // neutral border

        // ── Accent: warm taupe/bronze ──────────────────────
        brass: "#a89478",            // primary accent
        "brass-soft": "rgba(168,148,120,0.15)", // accent surface

        // ── Signal: muted emerald, kept distinct from brass ──
        signal: "#5a9e7a",

        // ── Typography ──────────────────────────────────────
        "ink-text": "#e8e8ed",
        muted: "#9a9aa4",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        "orbit-drift": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "orbit-drift": "orbit-drift 60s linear infinite",
      },
    },
  },
  plugins: [],
};