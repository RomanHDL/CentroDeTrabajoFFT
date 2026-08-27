/* ─────────────────────────────────────────────
   Tipo de personal visual, exclusivo de WC LINEA 0-10 (2026-08-28,
   "REDISEÑO DE WC LINEA 0 A WC LINEA 10", a peticion explicita del
   usuario: "identidad visual propia, NO copiar el diseño de Paletizado").
   Sistema DELIBERADAMENTE separado de rankSystem.js (ese es el de
   Paletizado/Accesorios/Insumos/Midea/Conveyor, LineLikeAreaDetail.jsx) --
   nunca comparten colores/iconos/logica entre si, para que un cambio en
   uno nunca arrastre al otro.

   Deriva SIEMPRE de datos reales, nunca del nombre del empleado:
   - `stationRole` = workstation.role (el mismo dato ya usado por
     LineStationCard/workstations.js, nunca inventado).
   - `actividad` = codigo crudo de BASE (LAYOUT FFT.xlsx), expuesto por
     getActividadForEmployee() en personnelByArea.js. Ese archivo ya
     documenta que estos codigos van "SIN interpretar significado" salvo
     casos inequivocos -- "LIDER" es el UNICO codigo completo y sin
     ambiguedad (L/EM/LC/SA/PE/M/TC/TG/E/PC/C son abreviaturas sin
     significado confirmado, nunca se les inventa uno aqui).

   IMPORTANTE (Seccion 4/31 del pedido): cuando alguien con actividad
   LIDER ocupa una estacion real (ej. "Etiquetado 2"), la estacion NUNCA
   se renombra a "Líder de Línea" -- eso inventaria una identidad de
   estacion falsa. Solo cambia el badge de TIPO DE PERSONAL bajo su
   nombre; el nombre/numero de la estacion sigue siendo el real. ───────────────────────────────────────────── */

export const LINE_VISUAL_TYPES = {
  APOYO_CALIDAD: { key: 'APOYO_CALIDAD', label: 'Apoyo / Calidad', color: '#DB2777', iconKey: 'apoyoCalidad' },
  LINE_LEADER: { key: 'LINE_LEADER', label: 'Líder de Línea', color: '#16A34A', iconKey: 'lineLeader' },
  PRODUCTION: { key: 'PRODUCTION', label: 'Producción', color: '#2563EB', iconKey: 'production' },
  SPECIALIZED: { key: 'SPECIALIZED', label: 'Especializado', color: '#F59E0B', iconKey: 'specialized' },
  OTHER_SUPPORT: { key: 'OTHER_SUPPORT', label: 'Otros apoyos', color: '#7C3AED', iconKey: 'otherSupport' },
}

/* Orden fijo para la leyenda. */
export const LINE_VISUAL_TYPE_ORDER = [
  LINE_VISUAL_TYPES.APOYO_CALIDAD,
  LINE_VISUAL_TYPES.LINE_LEADER,
  LINE_VISUAL_TYPES.PRODUCTION,
  LINE_VISUAL_TYPES.SPECIALIZED,
  LINE_VISUAL_TYPES.OTHER_SUPPORT,
]

/* Roles base reales de linea que se clasifican como PRODUCCION (todos
   los de LINE_BASE_ROLES en workstations.js excepto "Prueba eléctrica",
   que es un puesto tecnico real -> ESPECIALIZADO). */
const PRODUCTION_ROLES = new Set(['Montaje', 'Limpieza', 'Etiquetado', 'Suministro de Accesorios'])

/**
 * Clasifica visualmente a quien ocupa una estacion de linea. Prioridad
 * determinista (nunca por nombre de persona):
 *   1. Estacion "Calidad" (rol real, ver workstations.js) -> APOYO_CALIDAD.
 *   2. Empleado con actividad real "LIDER" (BASE) -> LINE_LEADER.
 *   3. Estacion "Prueba eléctrica" (puesto tecnico real) -> SPECIALIZED.
 *   4. Resto de roles base reales (Montaje/Limpieza/Etiquetado/Suministro
 *      de Accesorios) -> PRODUCTION.
 *   5. Sin ocupante, o rol que no calza con nada conocido -> null (nunca
 *      se inventa un tipo).
 * OTHER_SUPPORT no tiene hoy ninguna señal real que lo dispare -- queda
 * definido en la leyenda por completitud, pero esta funcion nunca lo
 * devuelve mientras no exista un dato real que lo respalde.
 */
export function getPersonnelVisualType({ stationRole, actividad } = {}) {
  if (!stationRole) return null
  if (stationRole === 'Calidad') return LINE_VISUAL_TYPES.APOYO_CALIDAD
  if (actividad === 'LIDER') return LINE_VISUAL_TYPES.LINE_LEADER
  if (stationRole === 'Prueba eléctrica') return LINE_VISUAL_TYPES.SPECIALIZED
  if (PRODUCTION_ROLES.has(stationRole)) return LINE_VISUAL_TYPES.PRODUCTION
  return null
}
