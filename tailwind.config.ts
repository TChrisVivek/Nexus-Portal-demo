import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Background layers (light) ──────────────────────────────────
        "deep-space": "#f1f5f9",   // page background
        "space-blue": "#ffffff",   // card background
        "space-blue-light": "#f8fafc",   // hover / alternate rows
        "space-blue-mid": "#e2e8f0",   // borders, dividers

        // ── Primary accent: corporate blue ─────────────────────────────
        "cyan-glow": "#2563eb",   // primary blue
        "cyan-muted": "#1d4ed8",   // darker blue (hover)
        "cyan-dim": "#dbeafe",   // light blue tint bg

        // ── Secondary accent: violet ───────────────────────────────────
        "purple-accent": "#7c3aed",
        "purple-soft": "#6d28d9",
        "purple-dim": "#ede9fe",

        // ── Semantic ───────────────────────────────────────────────────
        "success": "#16a34a",
        "warning": "#d97706",
        "danger": "#dc2626",
        "info": "#0ea5e9",

        // ── Text ───────────────────────────────────────────────────────
        "text-primary": "#0f172a",   // slate-900
        "text-secondary": "#475569",   // slate-600
        "text-muted": "#94a3b8",   // slate-400

        // ── Glass / border ─────────────────────────────────────────────
        "glass-border": "#e2e8f0",           // slate-200
        "glass-border-hover": "rgba(37,99,235,0.3)", // blue on hover
      },
      backgroundImage: {
        // Cards — clean white gradient
        "glass": "linear-gradient(145deg, #ffffff, #f8fafc)",
        // Primary button
        "cyan-glow-grad": "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        // Secondary button
        "purple-glow-grad": "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
        // Card gradient
        "card-gradient": "linear-gradient(145deg, #ffffff, #f8fafc)",
        // Hero background — very subtle
        "hero-gradient": [
          "radial-gradient(ellipse 70% 50% at 20% 0%, rgba(37,99,235,0.05) 0%, transparent 60%)",
          "radial-gradient(ellipse 50% 40% at 80% 100%, rgba(124,58,237,0.04) 0%, transparent 60%)",
        ].join(", "),
        // Sidebar active item
        "sidebar-active": "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0.04) 100%)",
        // Metric accent strips
        "accent-cyan": "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
        "accent-purple": "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
        "accent-success": "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)",
        "accent-warning": "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
      },
      boxShadow: {
        // Elevation
        "cyan-glow": "0 0 0 3px rgba(37,99,235,0.12), 0 4px 16px rgba(37,99,235,0.15)",
        "cyan-sm": "0 0 0 2px rgba(37,99,235,0.10)",
        "purple-glow": "0 0 0 3px rgba(124,58,237,0.12), 0 4px 16px rgba(124,58,237,0.12)",
        // Cards
        "card": "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(37,99,235,0.15)",
        // Sidebar
        "sidebar": "1px 0 0 0 #e2e8f0, 2px 0 12px rgba(0,0,0,0.04)",
        // Input focus
        "input-focus": "0 0 0 3px rgba(37,99,235,0.15)",
      },
      borderColor: {
        DEFAULT: "#e2e8f0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 4s ease-in-out infinite",
        "glow": "glow 2.5s ease-in-out infinite alternate",
        "slide-in": "slideIn 0.3s ease-out",
        "fade-in": "fadeIn 0.35s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 0 2px rgba(37,99,235,0.1)" },
          "100%": { boxShadow: "0 0 0 4px rgba(37,99,235,0.25)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
