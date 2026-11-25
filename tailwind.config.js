/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#070a1c', 900: '#0b1030', 800: '#111846', 700: '#1a2260' },
        violet: { 450: '#8b5cf6' },
        gold: { 300: '#f1d58a', 400: '#e0b95a', 500: '#c99a2e' },
        teal: { 400: '#2dd4bf' }
      },
      fontFamily: { display: ['"Playfair Display"', 'Georgia', 'serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 0 40px -8px rgba(139,92,246,.55)' }
    }
  },
  plugins: []
}
