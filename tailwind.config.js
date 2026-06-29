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
        ink: "#0B0F14",              // deepest background
        panel: "#111720",            // card / sidebar surface
        "panel-2": "#1A2030",        // elevated surface (inputs, badges)
        line: "rgba(148,163,194,0.10)", // borders — slightly blue-tinted

        // ── Accent: refined steel-blue ────────────────────
        // A sophisticated muted blue that reads as premium
        // without the heaviness of gold/brass.
        brass: "#5B8AF5",            // primary accent (was gold)
        "brass-soft": "rgba(91,138,245,0.12)", // accent surface

        // ── Signal: crisp teal ────────────────────────────
        signal: "#34D399",           // success / positive (cleaner emerald)

        // ── Typography ────────────────────────────────────
        "ink-text": "#E8ECF4",       // primary text — cool white
        muted: "#7B8BA5",            // secondary text — slate
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
