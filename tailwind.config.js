import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
// Fase 6 (MI Stack Reference): paleta shadcn/ui estandar, consumiendo las
// variables CSS definidas en src/index.css (a su vez portadas 1:1 de
// src/ui/theme.js / buildTheme de MUI: #1D4ED8, fondos F4F6F9/0B1120,
// paper FFFFFF/0F172A). CORRECCION 2026-08-29: la version anterior de este
// archivo solo registraba `primary`/`background`/`paper` con hex literal y
// NUNCA conectaba `card`/`foreground`/`border`/`popover`/`accent`/etc a las
// variables de index.css -- esas clases (bg-card, text-foreground,
// border-border...) usadas en Sidebar/AppLayout/tooltip/sheet no existian
// como utilidades reales, asi que Tailwind las ignoraba en silencio y el
// panel del sidebar quedaba sin fondo (transparente, reportado por el
// usuario con captura real). El patron hsl(var(--x)) de abajo es el
// estandar de shadcn/ui -- cubre TODOS los tokens que index.css define.
// Dark mode por clase (no 'media') porque el toggle claro/oscuro ya es
// manual via App.jsx (estado `mode` + setMode), no el OS.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
