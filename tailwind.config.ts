import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          enuri: "#ff6b35",
          danawa: "#1f6feb",
        },
        positive: "#16a34a",
        negative: "#dc2626",
      },
    },
  },
  plugins: [],
};
export default config;
