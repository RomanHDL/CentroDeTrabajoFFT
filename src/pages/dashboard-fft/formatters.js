// Formato de numeros/porcentajes del Dashboard FFT (2026-09-17, a peticion explicita del usuario
// -- "1,216 no 1216.000000", "+11.7% / -2.4%"). `en-US` a proposito (no `es-MX`/locale del
// navegador): esta pantalla es una TV fija en planta, mismo formato exacto sin importar el idioma
// que tenga configurado el navegador de turno -- coma como separador de miles, nunca punto.
export function formatInt(value) {
  if (value === null || value === undefined) return '—'
  return Math.round(value).toLocaleString('en-US')
}

export function formatPct(value, { decimals = 1 } = {}) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}
