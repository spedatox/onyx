import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        onyx: {
          void: "#05070a",
          base: "#080b10",
          petrol: "#0e1319",
          steel: "#161d26",
          surface: "rgba(14, 19, 25, 0.75)",
          surfaceHover: "rgba(22, 29, 38, 0.85)",
          border: "rgba(219, 230, 236, 0.08)",
          borderBright: "rgba(127, 164, 196, 0.35)",
          cyan: "#7fa4c4",
          cyanBright: "#a9c6dc",
          cyanDim: "#5b7691",
          amber: "#d99c44",
          amberBright: "#f2b75c",
          green: "#4fa377",
          greenBright: "#62c592",
          red: "#c84a3a",
          redBright: "#e05d4d",
          text: "#dbe6ec",
          textDim: "#93a6b1",
          textFaint: "#5d6f7a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
