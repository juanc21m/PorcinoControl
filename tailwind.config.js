/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /**
         * Escala de grises semántica basada en variables CSS: 50 = texto
         * principal … 900 = superficie de tarjeta, 950 = fondo de página.
         * En modo claro la escala se invierte (ver index.css), así que todas
         * las utilidades existentes (bg-gray-900, text-gray-400, …) cambian de
         * tema solas sin tocar cada componente.
         */
        gray: {
          50:  'rgb(var(--c-gray-50) / <alpha-value>)',
          100: 'rgb(var(--c-gray-100) / <alpha-value>)',
          200: 'rgb(var(--c-gray-200) / <alpha-value>)',
          300: 'rgb(var(--c-gray-300) / <alpha-value>)',
          400: 'rgb(var(--c-gray-400) / <alpha-value>)',
          500: 'rgb(var(--c-gray-500) / <alpha-value>)',
          600: 'rgb(var(--c-gray-600) / <alpha-value>)',
          700: 'rgb(var(--c-gray-700) / <alpha-value>)',
          800: 'rgb(var(--c-gray-800) / <alpha-value>)',
          900: 'rgb(var(--c-gray-900) / <alpha-value>)',
          950: 'rgb(var(--c-gray-950) / <alpha-value>)',
        },
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
