/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}",
    "./screens/**/*.{js,ts,tsx}",
    "./providers/**/*.{js,ts,tsx}",
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
        },
        editorial: {
          page: "#FAFAF7",
          secondary: "#F5F4F0",
          tertiary: "#EDECE8",
          border: "#E8E7E3",
          "text-primary": "#1A1A1A",
          "text-secondary": "#4A4A4A",
          "text-muted": "#737373",
          success: "#2D8A56",
          error: "#C53030",
          info: "#2B6CB0",
          charcoal: "#141414",
          "dark-card": "#1E1E1E",
          "dark-tertiary": "#2A2A2A",
        },
      },
    },
  },
  plugins: [],
};
