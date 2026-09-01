/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1A4F8A', light: '#D3E8FC', dark: '#0B1D35' },
      }
    }
  },
  plugins: [],
}

