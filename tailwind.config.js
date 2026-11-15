/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nova: {
          black: '#000000',
          950: '#050505',
          900: '#0a0a0a',
          850: '#111111',
          800: '#171717',
          750: '#202020',
          700: '#2a2a2a',
          600: '#383838',
          border: '#1c1c1c',
          'border-hover': '#333333',
          muted: '#808080',
          text: '#ededed',
          cyan: '#06b6d4',
          'cyan-glow': 'rgba(6, 182, 212, 0.12)',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace'
        ]
      }
    },
  },
  plugins: [],
};
