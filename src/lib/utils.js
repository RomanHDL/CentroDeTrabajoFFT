import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Misma matematica que MUI alpha(color, opacity) (rgba real, no el hack de
// sufijo hex de 2 digitos) -- para colores dinamicos en runtime (accent
// props) que Tailwind no puede resolver como clase estatica.
export function hexToRgba(hex, alpha) {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
