// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // <--- THIS IS CRITICAL
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}