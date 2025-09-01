/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.{html,js}",
    "./routes/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'utec-primary': '#1e3a8a',
        'utec-secondary': '#3b82f6',
        'utec-accent': '#06b6d4',
        'utec-success': '#10b981',
        'utec-warning': '#f59e0b',
        'utec-danger': '#ef4444',
        'utec-dark': '#1f2937',
        'utec-light': '#f8fafc'
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}

