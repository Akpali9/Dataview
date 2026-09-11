/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0E0F11',
        surface: '#16181B',
        surfaceRaised: '#1D2023',
        line: '#2A2D31',
        ink: '#EDEDEC',
        inkMuted: '#9A9DA3',
        accent: '#5EA5A0',
        accentDim: '#3C6B67',
        warn: '#C97B4A'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
