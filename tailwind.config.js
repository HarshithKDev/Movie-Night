/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./html/*.html",
    "./js/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#0a0a0a',
        'surface': '#1a1a1a',
        'primary': '#9333ea', // Lighter purple for better visibility
        'secondary': '#10b981',
        'on-background': '#f5f5f5',
        'on-surface': '#d4d4d4',
        'on-primary': '#ffffff',
        'error': '#f43f5e',
      },
      animation: {
        'enter': 'enter 0.3s ease-out',
        'leave': 'leave 0.3s ease-in forwards',
      },
      keyframes: {
        enter: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        leave: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}