/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './templates/**/*.html',
    './static/**/*.js',
  ],
  safelist: [
    // Dynamically applied by JS (drag-over, risk chips)
    'border-gold',
    'risk-low', 'risk-medium', 'risk-high',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f2057',
          light:   '#1a3070',
          dark:    '#091540',
        },
        gold: {
          DEFAULT: '#F5A623',
          light:   '#FBBF47',
          dark:    '#D4881A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease both',
      },
    },
  },
  plugins: [],
};
