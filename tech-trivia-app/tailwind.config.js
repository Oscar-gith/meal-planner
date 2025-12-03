/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'globant-green': '#A4CF30',
        'globant-dark': '#161616',
      },
    },
  },
  plugins: [],
}
