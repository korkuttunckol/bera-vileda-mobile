/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1e3a5f',
          'navy-dark': '#152a45',
          'navy-light': '#2a5082',
          'navy-muted': '#3d6a9e',
          white: '#ffffff',
          surface: '#F7F8FA',
          gray: {
            50: '#F7F8FA',
            100: '#eef0f4',
            200: '#e2e6ec',
            300: '#c8ced8',
            400: '#9aa3b2',
            500: '#6b7585',
            600: '#4a5364',
            700: '#333b49',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '17px',
      },
      boxShadow: {
        card: '0 2px 4px 0 rgb(30 58 95 / 0.06), 0 6px 16px -4px rgb(30 58 95 / 0.1)',
        'card-hover':
          '0 8px 20px -4px rgb(30 58 95 / 0.14), 0 4px 10px -4px rgb(30 58 95 / 0.08)',
        'card-elevated':
          '0 4px 8px -2px rgb(30 58 95 / 0.08), 0 12px 28px -6px rgb(30 58 95 / 0.14)',
        modal: '0 10px 25px -5px rgb(30 58 95 / 0.15)',
        nav: '0 -1px 0 rgb(30 58 95 / 0.06)',
        header: '0 8px 24px -6px rgb(21 42 69 / 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.28s ease-out both',
        'fade-in-fast': 'fade-in-fast 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
