/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Core surfaces — warm ivory, no stark white/blue-gray ──
        ink: "#f5f2ed",               // page background
        panel: "#ffffff",             // card / sidebar surface
        "panel-2": "#ece6dc",         // elevated surface (inputs, badges)
        line: "rgba(20,16,10,0.10)",  // neutral border

        // ── Accent: deep burgundy ──────────────────────────
        brass: "#6e2f3a",             // primary accent
        "brass-soft": "rgba(110,47,58,0.10)", // accent surface

        // ── Signal: deep emerald, kept distinct from brass ──
        signal: "#2f7d54",

        // ── Typography ──────────────────────────────────────
        "ink-text": "#1e1a15",
        muted: "#6b645a",
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