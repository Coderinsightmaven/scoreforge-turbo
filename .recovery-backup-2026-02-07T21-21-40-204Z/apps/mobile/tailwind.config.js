/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
    "./providers/**/*.{js,ts,tsx}",
    "./hooks/**/*.{js,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        display: ["ClashDisplay-Regular"],
        "display-medium": ["ClashDisplay-Medium"],
        "display-semibold": ["ClashDisplay-Semibold"],
        "display-bold": ["ClashDisplay-Bold"],
        sans: ["DMSans-Regular"],
        "sans-medium": ["DMSans-Medium"],
        "sans-semibold": ["DMSans-SemiBold"],
        "sans-bold": ["DMSans-Bold"],
      },
      colors: {
        brand: {
          DEFAULT: "#D4A017",
          hover: "#B8860B",
          light: "#FDF6E3",
          text: "#92400e",
          dark: "#E8B931",
          glow: "#FFD700",
        },
        surface: {
          primary: "#FFFFFF",
          secondary: "#F8F9FA",
          tertiary: "#F1F3F5",
        },
        "text-primary": "#0F172A",
        "text-secondary": "#475569",
        "text-tertiary": "#94A3B8",
        "text-inverse": "#FFFFFF",
        status: {
          live: {
            bg: "#FEF2F2",
            text: "#DC2626",
            border: "#EF4444",
          },
          active: {
            bg: "#F0FDF4",
            text: "#16A34A",
            border: "#22C55E",
          },
          pending: {
            bg: "#F8FAFC",
            text: "#64748B",
            border: "#94A3B8",
          },
          completed: {
            bg: "#EFF6FF",
            text: "#2563EB",
            border: "#3B82F6",
          },
        },
        dark: {
          bg: "#0F172A",
          card: "#1E293B",
          elevated: "#334155",
        },
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },
      },
    },
  },
  plugins: [],
};
