/* ─────────────────────────────────────────────
   Catalogo central de Areas de Trabajo para el modulo
   Control de Produccion.

   Estas 23 areas vienen directamente de la hoja LAYOUT del
   archivo real LAYOUT FFT.xlsx (tabla resumen AREA/IDEAL/REAL,
   columnas AV:AY) — no son inventadas. `isProduction` distingue
   las lineas/areas que producen piezas de las areas de soporte,
   liderazgo y capacitacion que tambien aparecen ahi (el Excel
   mezcla ambos tipos en la misma tabla, sin marcarlos, asi que
   la clasificacion aqui es nuestra lectura de esa tabla).

   `dailyTarget` se deja en null a proposito: este Excel es de
   PERSONAL, no trae metas de produccion reales, y no vamos a
   inventar una meta. El dia que exista una fuente real de
   produccion, se llena desde ahi.
   ───────────────────────────────────────────── */

export const SHIFT_OPTIONS = ['Matutino', 'Vespertino', 'Nocturno']

export const CURRENT_SHIFT = 'Matutino'

/* Ventana horaria del turno Matutino, usada para la
   grafica de produccion por hora (cuando exista fuente real). */
export const SHIFT_HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']

/* AREA_TYPES — distincion conceptual explicita, para que la UI
   nunca vuelva a asumir "si es un area, entonces tiene estaciones
   de linea":

   PRODUCTION_LINE  -> Linea 1..10. Unicas que usan el template de
                       estaciones/puestos (Montaje, Prueba electrica,
                       Etiquetado, etc. — data/personnel/workstations.js).
   WORK_AREA        -> areas productivas/operativas con su propia
                       forma de trabajar (Paletizado, Accesorios,
                       Cajas, High Value, Conveyor, DMT, Linea de
                       proyecto, Calidad). NUNCA reciben el template
                       de estaciones de linea.
   SUPPORT_AREA     -> grupos/funciones de personal, no producen en
                       estaciones (Capacitacion, Team Leader,
                       Soporte, Limpieza, Gerente, Supervisor).

   `idealHeadcount` = plantilla oficial (tabla IDEAL/REAL/DIFERENCIA
   proporcionada). null cuando el area no tiene plantilla oficial
   definida todavia (p. ej. CALIDAD no aparece en esa tabla) — NUNCA
   se inventa un ideal. El "REAL" NUNCA se guarda aqui: siempre se
   calcula desde el personal real (personnelByArea.getAreaHeadcount),
   para no duplicar una fuente de verdad. */
export const AREA_TYPES = {
  PRODUCTION_LINE: 'PRODUCTION_LINE',
  WORK_AREA: 'WORK_AREA',
  SUPPORT_AREA: 'SUPPORT_AREA',
}

export const WORK_CENTERS = [
  { id: 'LINEA1', name: 'Línea 1', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA2', name: 'Línea 2', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA3', name: 'Línea 3', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA4', name: 'Línea 4', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA5', name: 'Línea 5', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 6 },
  { id: 'LINEA6', name: 'Línea 6', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA7', name: 'Línea 7', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA8', name: 'Línea 8', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA9', name: 'Línea 9', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'LINEA10', name: 'Línea 10', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'PROYECTO', name: 'Línea de proyecto', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 10 },
  { id: 'PALETIZADO', name: 'Paletizado', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 13 },
  { id: 'CAJAS', name: 'Cajas', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 7 },
  { id: 'ACCESORIOS', name: 'Accesorios', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 20 },
  { id: 'CONVEYOR', name: 'Conveyor', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 1 },
  { id: 'DMT', name: 'DMT', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 2 },
  { id: 'HIGH_VALUE', name: 'High Value', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 14 },
  { id: 'CALIDAD', name: 'Calidad', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null },
  { id: 'CAPACITACION', name: 'Capacitación', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  { id: 'TEAM_LEADER', name: 'Team Leader', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  { id: 'SOPORTE', name: 'Soporte', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 3 },
  { id: 'LIMPIEZA', name: 'Limpieza', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  { id: 'GERENTE', name: 'Gerente', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 1 },
  { id: 'SUPERVISOR', name: 'Supervisor', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 1 },
]

export const LINES_ONLY = WORK_CENTERS.filter(w => w.kind === 'linea')
export const PRODUCTION_CENTERS = WORK_CENTERS.filter(w => w.isProduction)
export const SUPPORT_CENTERS = WORK_CENTERS.filter(w => !w.isProduction)

/* Unica fuente de verdad de "esta area usa el template de
   estaciones de linea" — antes esto se asumia implicitamente para
   TODO WORK_CENTER (el bug conceptual reportado). */
export function hasLineStations(workCenterId) {
  return workCenterById(workCenterId)?.type === AREA_TYPES.PRODUCTION_LINE
}

export const STATIONS = [
  'Montaje',
  'Prueba eléctrica',
  'Limpieza',
  'Etiquetado',
  'Suministro de Accesorios',
  'Empaque',
  'Calidad',
  'Supervisión',
  'Capacitación',
]

/* Estado operativo de un centro de trabajo — independiente
   del % de avance de produccion. SIN_DATOS es el estado por
   defecto mientras no exista una fuente real de produccion;
   nunca se asume "Operando" sin evidencia. */
export const OPERATIONAL_STATUS = {
  OPERANDO: { label: 'Operando', dot: '#10B981', tone: 'ok' },
  ATENCION: { label: 'En atención', dot: '#F59E0B', tone: 'warn' },
  MANTENIMIENTO: { label: 'Mantenimiento', dot: '#3B82F6', tone: 'info' },
  DETENIDO: { label: 'Detenido', dot: '#EF4444', tone: 'bad' },
  SIN_DATOS: { label: 'Sin datos', dot: '#94A3B8', tone: 'default' },
}

export function workCenterById(id) {
  return WORK_CENTERS.find(w => w.id === id)
}
