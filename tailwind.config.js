/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./js/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Material Design Dark Theme Palette
        'background': '#121212', // Page background
        'surface': '#1E1E1E',   // Card and component backgrounds
        'primary': '#6200EE',   // Primary actions, buttons
        'secondary': '#03DAC6', // Secondary accents
        'on-background': '#FFFFFF',
        'on-surface': '#E0E0E0',
        'on-primary': '#FFFFFF',
        'error': '#CF6679',
      }
    },
  },
  plugins: [], // DaisyUI plugin removed
}