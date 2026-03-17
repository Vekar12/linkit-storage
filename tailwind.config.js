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
        dark: {
          bg: '#0d1117',
          surface: '#161b22',
          raised: '#1c2333',
          border: '#21262d',
          borderhover: '#3d444d',
          text: '#e6edf3',
          muted: '#7d8590',
          dim: '#484f58',
        },
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
        glow: '0 0 0 1px rgba(124, 58, 237, 0.4), 0 4px 24px rgba(124, 58, 237, 0.15)',
        'glow-lg': '0 0 0 1px rgba(124, 58, 237, 0.5), 0 8px 40px rgba(124, 58, 237, 0.25)',
      },
    },
  },
  plugins: [],
};
