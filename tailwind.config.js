/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        'primary-dark': '#6D28D9',
        'primary-light': '#8B5CF6',
        secondary: '#EDE9FE',
        background: '#F5F3FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      },
      boxShadow: {
        purple: '0 4px 24px rgba(124, 58, 237, 0.18)',
        'purple-lg': '0 8px 40px rgba(124, 58, 237, 0.25)',
      },
    },
  },
  plugins: [],
};
