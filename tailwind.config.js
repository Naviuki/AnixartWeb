const { addIconSelectors } = require("@iconify/tailwind");
const flowbiteReact = require("flowbite-react/plugin/tailwindcss");

flowbiteReact.config = {
  charts: true,
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ".flowbite-react/class-list.json"
  ],
  plugins: [
    addIconSelectors(["mdi", "material-symbols", "twemoji", "fa6-brands", "solar", "tabler"]),
    flowbiteReact,
    require("tailwind-scrollbar")
  ],
  darkMode: "selector",
  theme: {
    extend: {
      colors: {
        acc: "var(--acc)",
        bg: "var(--bg)",
        s1: "var(--s1)",
        s2: "var(--s2)",
        bd: "var(--bd)",
        t1: "var(--t1)",
        t2: "var(--t2)",
        t3: "var(--t3)",
      },
      borderRadius: {
        rd: "var(--r)",
      },
      animation: {
        bg_zoom: "bg_zoom 150ms linear",
        bg_zoom_rev: "bg_zoom_rev 150ms linear",
      },
      keyframes: {
        bg_zoom: {
          "0%": {
            "background-size": "100% auto",
          },
          "100%": {
            "background-size": "110% auto",
          },
        },
        bg_zoom_rev: {
          "0%": {
            "background-size": "110% auto",
          },
          "100%": {
            "background-size": "100% auto",
          },
        },
      },
    },
  },
};