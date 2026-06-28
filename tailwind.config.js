/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#F5A623',
          'gold-light': '#FFB83F',
          'gold-dark': '#E07B00',
          orange: '#E07B00',
          dark: '#0D0D0D',
          dark2: '#1A1A1A',
          dark3: '#242424',
          border: '#2E2E2E',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'gold-pulse': 'goldPulse 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        goldPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,166,35,0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(245,166,35,0.15)' },
        },
      },
    },
  },
  plugins: [],
}
