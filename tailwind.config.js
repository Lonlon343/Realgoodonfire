/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        realgreen: '#10B981',
        realorange: '#F97316',
        realbg: '#FAFAFA',
      },
      borderRadius: {
        squircle: '1.5rem',
      },
    },
  },
  plugins: [],
}
