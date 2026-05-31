/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#4caf50',
          600: '#43a047',
          700: '#388e3c',
          800: '#2E7D32',
          900: '#1b5e20',
        },
      },
      boxShadow: {
        glow: '0 0 16px 2px rgba(46,125,50,0.35)',
        'glow-lg': '0 0 28px 4px rgba(46,125,50,0.45)',
      },
    },
  },
  plugins: [],
};

