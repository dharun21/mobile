/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0C0B12',
        base: '#0C0B12',
        canvas: 'rgb(var(--theme-ink) / <alpha-value>)',
        panel: 'rgb(var(--theme-panel) / <alpha-value>)',
        raised: 'rgb(var(--theme-raised) / <alpha-value>)',
        line: 'rgb(var(--theme-line) / <alpha-value>)',
        muted: 'rgb(var(--theme-muted) / <alpha-value>)',
        white: 'rgb(var(--theme-foreground) / <alpha-value>)',
        lilac: 'rgb(var(--theme-lilac) / <alpha-value>)',
        'lilac-bright': 'rgb(var(--theme-lilac-bright) / <alpha-value>)',
        mint: 'rgb(var(--theme-mint) / <alpha-value>)',
        amber: 'rgb(var(--theme-amber) / <alpha-value>)',
        rose: 'rgb(var(--theme-rose) / <alpha-value>)',
        body: 'rgb(var(--theme-body) / <alpha-value>)',
        action: 'rgb(var(--theme-action) / <alpha-value>)',
        'action-foreground': 'rgb(var(--theme-action-foreground) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['DMSans_400Regular'],
        display: ['Manrope_600SemiBold'],
        brand: ['GreatVibes_400Regular'],
      },
    },
  },
  plugins: [require('tailwindcss/plugin')(({ addUtilities }) => {
    // Native fonts are individual files. Select the actual face for every weight.
    addUtilities({
      '.font-medium': { fontFamily: 'DMSans_500Medium', fontWeight: 'normal' },
      '.font-semibold': { fontFamily: 'DMSans_600SemiBold', fontWeight: 'normal' },
      '.font-bold': { fontFamily: 'DMSans_700Bold', fontWeight: 'normal' },
      '.font-extrabold': { fontFamily: 'DMSans_700Bold', fontWeight: 'normal' },
      '.font-display': { fontFamily: 'Manrope_600SemiBold', fontWeight: 'normal' },
      '.font-brand': { fontFamily: 'GreatVibes_400Regular', fontWeight: 'normal' },
    });
  })],
};
