/* ─────────────────────────────────────────────
   Config del layout fisico del area (plano real) y de los grupos
   de color usados para distinguir tipos de area. Es solo
   configuracion/presentacion — no deriva conteos aqui (eso vive en
   personnelByArea.js para no duplicar logica entre Dashboard y
   Centro de Trabajo).

   PHYSICAL_ZONES son las zonas del plano fisico compartido por el
   Dashboard y Centro de Trabajo (mismo <WorkAreaMap>). "FFT" no es
   un area real del catalogo — es el bloque que agrupa LINEA0..10.
   Sorting / PNP-POC-PEN / Box Prep / Midea aparecen en el plano
   real pero hoy no tienen ningun area del catalogo mapeada 1:1;
   se muestran igual (para respetar el plano completo) pero su
   detalle es honesto: "sin datos", nunca personal inventado.
   ───────────────────────────────────────────── */

import { WORK_CENTERS, LINES_ONLY } from './catalog'

export const FFT_LINE_IDS = LINES_ONLY.map((w) => w.id)

export const PHYSICAL_ZONES = {
  SORTING: { id: 'SORTING', label: 'Sorting', areaIds: [] },
  FFT: { id: 'FFT', label: 'FFT', areaIds: FFT_LINE_IDS },
  MIDEA: { id: 'MIDEA', label: 'Midea and Mixed Products', areaIds: [] },
  PALLETIZING: { id: 'PALLETIZING', label: 'Palletizing', areaIds: ['PALETIZADO'] },
  PNP: { id: 'PNP', label: 'PNP / POC / PEN', areaIds: [] },
  BOXPREP: { id: 'BOXPREP', label: 'Box Prep', areaIds: [] },
  ACCESSORIES: { id: 'ACCESSORIES', label: 'Accessories', areaIds: ['ACCESORIOS'] },
}

const IDS_IN_PHYSICAL_ZONES = new Set(
  Object.values(PHYSICAL_ZONES).flatMap((z) => z.areaIds)
)

/* Areas auxiliares = todo lo que existe en el catalogo real pero no
   aparece ya representado dentro del bloque fisico principal
   (lineas FFT, Paletizado, Accesorios). Se muestran organizadas
   debajo/alrededor del layout, tal como pide el Excel real. */
export function getAuxiliaryAreas() {
  return WORK_CENTERS.filter((w) => w.kind === 'area' && !IDS_IN_PHYSICAL_ZONES.has(w.id))
}

/* Grupos de color MUY suaves, solo para distinguir tipo de area —
   nunca reemplazan el texto/etiqueta. */
export const COLOR_GROUPS = {
  PRODUCCION: { label: 'Producción', color: '#3B82F6' },
  SOPORTE_PRODUCCION: { label: 'Soporte producción', color: '#F59E0B' },
  CALIDAD_VALOR: { label: 'Calidad / Valor', color: '#F43F5E' },
  SOPORTE: { label: 'Soporte', color: '#14B8A6' },
  ADMINISTRATIVO: { label: 'Administrativo', color: '#A855F7' },
  LOGISTICA: { label: 'Logística', color: '#64748B' },
}

const AREA_TO_GROUP = {
  PALETIZADO: 'PRODUCCION', ACCESORIOS: 'PRODUCCION', CONVEYOR: 'PRODUCCION',
  CAJAS: 'SOPORTE_PRODUCCION', DMT: 'SOPORTE_PRODUCCION',
  CALIDAD: 'CALIDAD_VALOR', HIGH_VALUE: 'CALIDAD_VALOR',
  SOPORTE: 'SOPORTE', LIMPIEZA: 'SOPORTE',
  TEAM_LEADER: 'ADMINISTRATIVO', SUPERVISOR: 'ADMINISTRATIVO', GERENTE: 'ADMINISTRATIVO', CAPACITACION: 'ADMINISTRATIVO',
}

export function colorGroupForArea(areaId) {
  if (FFT_LINE_IDS.includes(areaId)) return 'PRODUCCION'
  return AREA_TO_GROUP[areaId] || 'SOPORTE'
}

export function colorForArea(areaId) {
  return COLOR_GROUPS[colorGroupForArea(areaId)].color
}
