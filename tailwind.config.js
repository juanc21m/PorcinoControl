/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Color primario: azul marino/carbón del logo Agrocomercial Moreno (#2B2E34)
        primary: {
          50:  '#f4f5f6',
          100: '#e5e6e9',
          200: '#cacdd2',
          300: '#a4a9b1',
          400: '#777d88',
          500: '#545a64',
          600: '#40454d',
          700: '#363a41',
          800: '#2B2E34',
          900: '#202329',
          950: '#16181b',
        },
        // Verde del logo (#2E9437 / #1C7A28) — acento de marca.
        brand: {
          50:  '#eafaed',
          100: '#cdf0d4',
          200: '#9fe0ab',
          300: '#66cc78',
          400: '#39b14f',
          500: '#2E9437',
          600: '#23842c',
          700: '#1C7A28',
          800: '#186321',
          900: '#14501c',
        },
        // Alias semántico del acento (mismo verde de marca).
        accent: {
          50:  '#eafaed',
          100: '#cdf0d4',
          200: '#9fe0ab',
          300: '#66cc78',
          400: '#39b14f',
          500: '#2E9437',
          600: '#23842c',
          700: '#1C7A28',
          800: '#186321',
          900: '#14501c',
        },
      },
      boxShadow: {
        glow: '0 0 16px 2px rgba(46,148,55,0.30)',
        'glow-lg': '0 0 28px 4px rgba(46,148,55,0.40)',
      },
    },
  },
  plugins: [],
};
