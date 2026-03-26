/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1e40af", light: "#3b82f6", dark: "#1e3a8a" },
        accent: { DEFAULT: "#f59e0b", light: "#fbbf24" },
      },
    },
  },
  plugins: [],
};
