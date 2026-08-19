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

export const WORK_CENTERS = [
  { id: 'LINEA1', name: 'Línea 1', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA2', name: 'Línea 2', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA3', name: 'Línea 3', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA4', name: 'Línea 4', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA5', name: 'Línea 5', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA6', name: 'Línea 6', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA7', name: 'Línea 7', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA8', name: 'Línea 8', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA9', name: 'Línea 9', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'LINEA10', name: 'Línea 10', kind: 'linea', isProduction: true, dailyTarget: null },
  { id: 'PROYECTO', name: 'Línea de proyecto', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'PALETIZADO', name: 'Paletizado', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'CAJAS', name: 'Cajas', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'ACCESORIOS', name: 'Accesorios', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'CONVEYOR', name: 'Conveyor', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'DMT', name: 'DMT', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'HIGH_VALUE', name: 'High Value', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'CALIDAD', name: 'Calidad', kind: 'area', isProduction: true, dailyTarget: null },
  { id: 'CAPACITACION', name: 'Capacitación', kind: 'area', isProduction: false, dailyTarget: null },
  { id: 'TEAM_LEADER', name: 'Team Leader', kind: 'area', isProduction: false, dailyTarget: null },
  { id: 'SOPORTE', name: 'Soporte', kind: 'area', isProduction: false, dailyTarget: null },
  { id: 'LIMPIEZA', name: 'Limpieza', kind: 'area', isProduction: false, dailyTarget: null },
  { id: 'GERENTE', name: 'Gerente', kind: 'area', isProduction: false, dailyTarget: null },
  { id: 'SUPERVISOR', name: 'Supervisor', kind: 'area', isProduction: false, dailyTarget: null },
]

export const LINES_ONLY = WORK_CENTERS.filter(w => w.kind === 'linea')
export const PRODUCTION_CENTERS = WORK_CENTERS.filter(w => w.isProduction)
export const SUPPORT_CENTERS = WORK_CENTERS.filter(w => !w.isProduction)

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
