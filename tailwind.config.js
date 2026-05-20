/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ocean': {
          50: '#f0f9ff',
          500: '#0284c7',
          600: '#0369a1',
          900: '#082f49',
        }
      }
    },
  },
  plugins: [],
}
