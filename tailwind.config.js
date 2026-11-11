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
        "fade-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.85)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "orbit-drift": "orbit-drift 60s linear infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "float-slow": "float-slow 7s ease-in-out infinite",
        "pop-in": "pop-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
      },
    },
  },
  plugins: [],
};