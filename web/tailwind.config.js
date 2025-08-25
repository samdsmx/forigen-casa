
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1f7a6d",   // provisional verde/teal
          dark: "#165a51",
          light: "#6ec6b2"
        }
      },
      borderRadius: {
        'xl2': '1rem'
      }
    },
  },
  plugins: [],
};
