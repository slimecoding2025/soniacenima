/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050506',
        graphite: '#111114',
        charcoal: '#1b1b20',
        smoke: '#8d8a93',
        bone: '#f1ebe3',
        ember: '#a3202f',
        wine: '#5c1020',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { shimmer: 'shimmer 1.8s infinite' },
    },
  },
  plugins: [],
};
