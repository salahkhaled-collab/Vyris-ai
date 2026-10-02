/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Core surfaces 
        ink: "#f5f2ed",               
        panel: "#ffffff",             
        "panel-2": "#ece6dc",         
        line: "rgba(20,16,10,0.10)",  

        // Accent
        brass: "#6e2f3a",           
        "brass-soft": "rgba(110,47,58,0.10)", 

        // ── Signal
        signal: "#2f7d54",

        // Typography 
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