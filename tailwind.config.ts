import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,tsx}",
    "./components/**/*.{js,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#F3F4F6",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111827"
        },
        border: "#E5E7EB",
        primary: {
          DEFAULT: "#2563EB",
          foreground: "#FFFFFF"
        }
      },
      boxShadow: {
        card: "0 10px 25px rgba(15,23,42,0.1)"
      },
      borderRadius: {
        lg: "0.75rem"
      }
    }
  },
  plugins: []
};

export default config;

