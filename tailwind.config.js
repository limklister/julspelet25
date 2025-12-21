/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ice-blue': '#87CEEB',
        'ice-light': '#B0E0E6',
        'ice-dark': '#4682B4',
        'snow-white': '#F0F8FF',
        'christmas-red': '#DC143C',
        'christmas-green': '#228B22',
        'christmas-gold': '#FFD700',
        'winter-silver': '#C0C0C0',
      },
      fontFamily: {
        'mono': ['"Courier New"', 'monospace'],
      },
      boxShadow: {
        'ice-glow': '0 0 20px #87CEEB, 0 0 40px #87CEEB',
        'snow-glow': '0 0 20px #F0F8FF, 0 0 40px #F0F8FF',
        'christmas-glow': '0 0 20px #DC143C, 0 0 40px #DC143C',
        'gold-glow': '0 0 20px #FFD700, 0 0 40px #FFD700',
      },
    },
  },
  plugins: [],
}
