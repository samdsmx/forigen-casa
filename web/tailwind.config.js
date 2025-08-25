
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4f46e5", // indigo base
          dark: "#3730a3",
          light: "#a5b4fc",
        }
      },
      borderRadius: {
        'xl2': '1rem'
      }
    },
  },
  plugins: [],
};
