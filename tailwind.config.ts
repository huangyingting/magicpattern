import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mp: {
          emerald: "#10B981",
          green: "#16A34A",
          indigo: "#4F46E5",
          canvas: "#F9FAFB",
          surface: "#FFFFFF",
          border: "#E5E7EB",
          ink: "#111827",
          muted: "#6B7280",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
};
export default config;
