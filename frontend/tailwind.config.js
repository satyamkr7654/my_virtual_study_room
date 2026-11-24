/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#f2f1ea',   // page
        sheet: '#fbfaf6',   // things lying on the page
        rule: '#d5d4c8',    // lines between them
        ink: {
          DEFAULT: '#16302a',
          soft: '#51635c',  // secondary text
          line: '#31504a',  // lines on dark
          deep: '#0e211d',  // the room's stage
        },
        lamp: '#f0b429',    // the one accent: light, selection, presence
        stop: '#a8321f',    // destructive
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'sans-serif'],
        serif: ['"Literata Variable"', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
