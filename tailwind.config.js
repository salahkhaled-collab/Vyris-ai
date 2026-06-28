/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Core surfaces ─────────────────────────────────
        // A refined slate-charcoal palette: slightly cooler,
        // with more contrast between layers for depth.
        ink: "#111114",              // deepest background
        panel: "#16161a",            // card / sidebar surface
        "panel-2": "#1a1a1f",        // elevated surface (inputs, badges)
        line: "rgba(255,255,255,0.06)", // borders — slightly blue-tinted

        // ── Accent: refined steel-blue ────────────────────
        // A sophisticated muted blue that reads as premium
        // without the heaviness of gold/brass.
        brass: "#7070a8",            // primary accent (was gold)
        "brass-soft": "rgba(112,112,168,0.15)", // accent surface

        // ── Signal: crisp teal ────────────────────────────
        signal: "#5a9e7a",           // success / positive (cleaner emerald)

        // ── Typography ────────────────────────────────────
        "ink-text": "#e8e8ed",       // primary text — cool white
        muted: "#4a4a52",            // secondary text — slate
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
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
