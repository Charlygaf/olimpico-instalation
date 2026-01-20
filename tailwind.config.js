/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colores personalizados para la instalación
      // Pensados para proyección sobre volumen físico
      colors: {
        'olimpico': {
          'pan': '#F5E6D3',
          'carne': '#8B4513',
          'queso': '#FFD700',
          'lechuga': '#90EE90',
          'tomate': '#FF6347',
        }
      },
    },
  },
  plugins: [],
}
