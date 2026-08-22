/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fef6ee",
          100: "#fdead7",
          200: "#fad1ae",
          300: "#f6b17a",
          400: "#f18744",
          500: "#ec6620",
          600: "#dd4d16",
          700: "#b73914",
          800: "#922e18",
          900: "#762816",
        },
      },
    },
  },
  plugins: [],
};
