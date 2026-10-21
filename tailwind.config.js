/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0C0B11',
        base: '#0C0B11',
        panel: '#17151F',
        raised: '#201D2B',
        line: '#302B3D',
        muted: '#9A94A8',
        lilac: '#C7A8FF',
        'lilac-bright': '#D9C3FF',
        mint: '#80DDB4',
        amber: '#FFD28A',
        rose: '#FF9DAE',
      },
    },
  },
  plugins: [],
};
