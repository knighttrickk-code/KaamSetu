/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        saffron: { DEFAULT: '#E8772E', 50: '#FDF2EA', 100: '#FBE2CF', 600: '#D0631C', 700: '#A94F15' },
        teal: { DEFAULT: '#0F5257', 50: '#E7F1F1', 100: '#C9E0E1', 700: '#0B3E42', 900: '#072A2D' },
        cream: '#FBF8F3',
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 8px 30px rgba(15,82,87,0.12)' },
    },
  },
  plugins: [],
};
