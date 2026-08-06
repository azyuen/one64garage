/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#E9E6DF',   // unbleached canvas — light mode background
          soft: '#F2F0EA',      // card surface
          line: '#D8D4C9',      // hairline dividers
        },
        ink: {
          DEFAULT: '#1B1A17',   // sumi ink — primary text light mode
          soft: '#5B5850',      // secondary text light mode
        },
        garage: {
          DEFAULT: '#121314',   // near-black — dark mode background
          soft: '#1B1D1F',      // dark mode card surface
          line: '#33353A',      // dark mode hairline
        },
        paper: {
          DEFAULT: '#EDEAE2',   // primary text dark mode
          soft: '#9B9C9A',      // secondary text dark mode
        },
        vermilion: {
          DEFAULT: '#B23A2E',   // signature accent — plate red
          soft: '#8F2E24',
          tint: '#E8CFC9',
        },
        steel: {
          DEFAULT: '#3D5A73',   // secondary accent — blueprint blue
          soft: '#2C4257',
        },
        console: {
          trim: '#211E1B',       // dark dashboard plastic
          'trim-light': '#37332C', // bevel highlight on physical buttons/dial
          'trim-dark': '#121110',  // bevel shadow, recessed screen well
          screen: '#080A06',      // LCD background, warm near-black
          glow: '#E1D6A5',        // amber-gold readout — sampled directly from the dashboard skin's baked-in text
          'glow-night': '#E0A876', // deeper amber-red readout — night mode
        },
      },
      fontFamily: {
        display: ['"Zen Kaku Gothic New"', '"Noto Sans JP"', 'sans-serif'],
        body: ['"Zen Kaku Gothic New"', '"Noto Sans JP"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        digital: ['"Share Tech Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        plate: '0.18em',
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
      },
    },
  },
  plugins: [],
}
