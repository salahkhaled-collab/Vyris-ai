/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1116",
        panel: "#161A22",
        "panel-2": "#1D222C",
        line: "rgba(255,255,255,0.07)",
        brass: "#C9A66B",
        "brass-soft": "rgba(201,166,107,0.14)",
        signal: "#7FE0C8",
        "ink-text": "#E7E9EE",
        muted: "#8A93A6",
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
