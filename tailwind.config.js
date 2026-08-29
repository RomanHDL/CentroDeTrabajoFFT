import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
// Fase 6 (MI Stack Reference): tokens portados 1:1 de src/ui/theme.js
// (buildTheme de MUI), para que ambos sistemas de diseño convivan sin
// diferencia visual mientras dura la migracion pagina por pagina.
// Dark mode por clase (no 'media') porque el toggle claro/oscuro ya es
// manual via App.jsx (estado `mode` + setMode), no el OS.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D4ED8',
          foreground: '#FFFFFF',
        },
        background: {
          DEFAULT: '#F4F6F9',
          dark: '#0B1120',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          dark: '#0F172A',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '10px',
        md: '8px',
        sm: '6px',
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
