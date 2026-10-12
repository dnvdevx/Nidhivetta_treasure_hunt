/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#2b0a07',
        card: '#44100b',
        inset: '#2a0a07',
        gold: '#fcc934',
        cream: '#f7e3c0',
        crimson: '#b30012',
        ring: '#7a1d14',
      },
      fontFamily: {
        serif: ['Lora', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        glow: {
          '0%': { transform: 'scale(0.6)', boxShadow: '0 0 0 rgba(252,201,52,0)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 18px rgba(252,201,52,.55)' },
        },
      },
      animation: { glow: 'glow .6s ease-out forwards' },
    },
  },
  plugins: [],
}
