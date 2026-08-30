/* ─────────────────────────────────────────────
   Config del layout fisico del area (plano real) y de los grupos
   de color usados para distinguir tipos de area. Es solo
   configuracion/presentacion — no deriva conteos aqui (eso vive en
   personnelByArea.js para no duplicar logica entre Dashboard y
   Centro de Trabajo).

   PHYSICAL_ZONES son las zonas del plano fisico compartido por el
   Dashboard y Centro de Trabajo (mismo <WorkAreaMap>). "FFT" no es
   un area real del catalogo — es el bloque que agrupa LINEA1..10
   (10 lineas reales; NO existe "Linea 0" — lo que antes se leia
   como L0 es en realidad PROYECTO/"Linea de proyecto", un area
   independiente que se muestra en el layout, no dentro de FFT).
   Sorting se elimino del layout operativo a peticion del usuario
   (no aporta valor visual actual); no se borro ningun dato de
   catalogo/backend relacionado, solo dejo de pintarse aqui.
   PNP-POC-PEN y Box Prep tambien se retiraron del layout (a peticion
   del usuario, 2026-08-19) — no tenian ningun area del catalogo
   mapeada, eran solo placeholders "Sin datos"; no se borro ningun
   dato real, simplemente dejaron de pintarse aqui.

   Los `label` de aqui son los titulos que se ven en las cajas
   principales del layout — todos empiezan con "CT " (Centro de
   Trabajo), igual que `name` en catalog.js, para que el titulo de
   la caja y el titulo del detalle/drawer coincidan siempre.
   ───────────────────────────────────────────── */

import { LINES_ONLY, WORK_CENTERS } from './catalog'

export const FFT_LINE_IDS = LINES_ONLY.map((w) => w.id)

export const PHYSICAL_ZONES = {
  PROYECTO: { id: 'PROYECTO', label: 'WC LINEA 0', areaIds: ['PROYECTO'] },
  FFT: { id: 'FFT', label: 'WC Líneas de producción (FFT)', areaIds: FFT_LINE_IDS },
  HIGHVALUE: { id: 'HIGHVALUE', label: 'WC Midea / High Value', areaIds: ['HIGH_VALUE'] },
  SELLADO: { id: 'SELLADO', label: 'WC Sellado', areaIds: ['SELLADO'] },
  INSUMOS: { id: 'INSUMOS', label: 'WC Insumos', areaIds: ['INSUMOS'] },
  SUMINISTRO: {
    id: 'SUMINISTRO',
    label: 'WC Suministro de material',
    areaIds: ['SUMINISTRO_MATERIAL'],
  },
  PALLETIZING: { id: 'PALLETIZING', label: 'WC Paletizado', areaIds: ['PALETIZADO'] },
  ACCESSORIES: { id: 'ACCESSORIES', label: 'WC Accesorios', areaIds: ['ACCESORIOS'] },
}

const IDS_IN_PHYSICAL_ZONES = new Set(Object.values(PHYSICAL_ZONES).flatMap((z) => z.areaIds))

/* Fase 6 (MI Stack Reference, cierre): extraida de WorkAreaMap.jsx (890
   lineas, MUI) al eliminar ese componente muerto -- ya no se renderiza en
   ningun lado desde que OperatingFloorPlan.jsx lo reemplazo, pero este
   helper puro (sin JSX/MUI) seguia en uso real por AreasLayoutView.jsx
   para el caso especial "click en FFT". Clasifica una PHYSICAL_ZONE segun
   cuantas areas reales agrupa, para decidir que tipo de panel de detalle
   mostrar (vacio/area unica/grupo de zona). */
export function describeZoneSelection(zone) {
  if (zone.areaIds.length === 0) return { type: 'empty', id: zone.id, label: zone.label }
  if (zone.areaIds.length === 1) return { type: 'area', id: zone.areaIds[0] }
  return { type: 'zoneGroup', id: zone.id, areaIds: zone.areaIds, label: zone.label }
}

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
  PALETIZADO: 'PRODUCCION',
  ACCESORIOS: 'PRODUCCION',
  PROYECTO: 'PRODUCCION',
  CONVEYOR_PRINCIPAL: 'PRODUCCION',
  CONVEYOR_SECUNDARIO: 'PRODUCCION',
  SELLADO: 'SOPORTE_PRODUCCION',
  INSUMOS: 'SOPORTE_PRODUCCION',
  SUMINISTRO_MATERIAL: 'SOPORTE_PRODUCCION',
  BOX_PREP: 'SOPORTE_PRODUCCION',
  CALIDAD: 'CALIDAD_VALOR',
  HIGH_VALUE: 'CALIDAD_VALOR',
  SOPORTE: 'SOPORTE',
  LIMPIEZA: 'SOPORTE',
  TEAM_LEADER: 'ADMINISTRATIVO',
  SUPERVISOR: 'ADMINISTRATIVO',
  GERENTE: 'ADMINISTRATIVO',
  CAPACITACION: 'ADMINISTRATIVO',
}

export function colorGroupForArea(areaId) {
  if (FFT_LINE_IDS.includes(areaId)) return 'PRODUCCION'
  return AREA_TO_GROUP[areaId] || 'SOPORTE'
}

export function colorForArea(areaId) {
  return COLOR_GROUPS[colorGroupForArea(areaId)].color
}
