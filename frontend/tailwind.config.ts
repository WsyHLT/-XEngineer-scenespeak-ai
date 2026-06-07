import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "border-flow": "border-flow 4s linear infinite",
        "wave-bar": "wave-bar 1.2s ease-in-out infinite",
        "tab-breathe": "tab-breathe 2.4s ease-in-out infinite",
        "wave-line": "wave-line 1.1s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "ripple": "ripple 2s ease-out infinite",
        "ring-spin": "ring-spin 3s linear infinite",
        "dot-bounce": "dot-bounce 1.2s ease-in-out infinite",
        "wave-3d": "wave-3d 0.9s ease-in-out infinite",
        "mic-pulse": "mic-pulse 1.1s ease-out infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.45", filter: "blur(28px)" },
          "50%": { opacity: "0.85", filter: "blur(36px)" },
        },
        "border-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "wave-bar": {
          "0%, 100%": { transform: "scaleY(0.35)", opacity: "0.5" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
        "tab-breathe": {
          "0%, 100%": { boxShadow: "0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)" },
          "50%": { boxShadow: "0 4px 14px rgba(67,56,202,0.25), inset 0 1px 0 rgba(255,255,255,0.1)" },
        },
        "wave-line": {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        ripple: {
          "0%": { transform: "scale(0.85)", opacity: "0.5" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        "ring-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "dot-bounce": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.45" },
          "50%": { transform: "translateY(-6px)", opacity: "1" },
        },
        "wave-3d": {
          "0%, 100%": { transform: "scaleY(0.25) rotateX(8deg)", opacity: "0.55" },
          "50%": { transform: "scaleY(1) rotateX(-4deg)", opacity: "1" },
        },
        "mic-pulse": {
          "0%": { transform: "scale(0.75)", opacity: "0.65" },
          "100%": { transform: "scale(1.45)", opacity: "0" },
        },
      },
      boxShadow: {
        depth: "0 4px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(255,255,255,0.05)",
        "depth-md": "0 6px 18px rgba(0,0,0,0.52), 0 1px 4px rgba(255,255,255,0.06)",
        "depth-lg": "0 8px 24px rgba(0,0,0,0.55), 0 2px 6px rgba(255,255,255,0.06)",
        "depth-hover": "0 12px 28px rgba(0,0,0,0.58), 0 2px 8px rgba(255,255,255,0.08)",
        neon: "0 4px 14px rgba(0,0,0,0.45), 0 1px 3px rgba(255,255,255,0.06)",
        "neon-lg": "0 8px 22px rgba(0,0,0,0.5), 0 2px 6px rgba(255,255,255,0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
