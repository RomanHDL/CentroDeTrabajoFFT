/* Paleta compartida por las graficas nuevas del Dashboard (2026-08-25) --
   colores suaves pero distinguibles (Parte 36 del prompt), ciclica para
   cualquier cantidad de areas. */
export const AREA_PALETTE = [
  '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#A855F7',
  '#EC4899', '#14B8A6', '#6366F1', '#84CC16', '#F97316', '#64748B',
]

export function colorForIndex(i) {
  return AREA_PALETTE[i % AREA_PALETTE.length]
}
