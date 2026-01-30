import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dbe6ff",
          200: "#b6cdff",
          300: "#8fb2ff",
          400: "#5e88ff",
          500: "#2f6bff",
          600: "#1f55db",
          700: "#173ea3",
          800: "#102b73",
          900: "#0b1b47",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;