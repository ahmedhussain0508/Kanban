// postcss.config.js (NEW)
module.exports = {
  plugins: {
    // Use the dedicated PostCSS plugin for Tailwind CSS
    '@tailwindcss/postcss': {}, // <--- Changed to the new package name
    autoprefixer: {},
  },
};