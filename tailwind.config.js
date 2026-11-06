/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        rounded: ['"Zen Maru Gothic"', '"Nunito"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif'],
      },
      colors: {
        oat: {
          50: '#FDFBF7',
          100: '#FAF4EB',
          200: '#F2E5D3',
          300: '#E5CFB3',
        },
        cocoa: {
          600: '#7C5841',
          700: '#5C3F2D',
          800: '#422B1D',
        },
        quokka: {
          light: '#D9A273',
          DEFAULT: '#BA7E4D',
          dark: '#965F34',
        },
      },
    },
  },
  plugins: [],
};
