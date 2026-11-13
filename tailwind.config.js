/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        plum: "#59345D",
        mauve: "#80608B",
        lavender: "#B99BDA",
        mist: "#F5EFF9",
        champagne: "#C9A77B",
      },
    },
  },
  plugins: [],
};
