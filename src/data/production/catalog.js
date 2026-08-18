/* ─────────────────────────────────────────────
   Catalogo central de Centros de Trabajo, Lineas
   y Estaciones para el modulo Control de Produccion.

   Metas centralizadas aqui a proposito: NO deben
   vivir enterradas dentro de un componente visual,
   para que en el futuro puedan venir de DB/config.
   ───────────────────────────────────────────── */

export const SHIFT_OPTIONS = ['Matutino', 'Vespertino', 'Nocturno']

export const CURRENT_SHIFT = 'Matutino'

/* Ventana horaria del turno Matutino, usada para la
   grafica de produccion por hora. */
export const SHIFT_HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']

/* Centros de trabajo / lineas / areas. `kind` distingue
   una linea numerada de un area de proceso, por si a
   futuro necesitan tratarse distinto. `dailyTarget` es
   la meta de produccion configurable por dia. */
export const WORK_CENTERS = [
  { id: 'L1', name: 'Línea 1', kind: 'linea', dailyTarget: 400 },
  { id: 'L2', name: 'Línea 2', kind: 'linea', dailyTarget: 450 },
  { id: 'L3', name: 'Línea 3', kind: 'linea', dailyTarget: 450 },
  { id: 'L4', name: 'Línea 4', kind: 'linea', dailyTarget: 420 },
  { id: 'L5', name: 'Línea 5', kind: 'linea', dailyTarget: 400 },
  { id: 'L6', name: 'Línea 6', kind: 'linea', dailyTarget: 400 },
  { id: 'L7', name: 'Línea 7', kind: 'linea', dailyTarget: 420 },
  { id: 'L8', name: 'Línea 8', kind: 'linea', dailyTarget: 400 },
  { id: 'L9', name: 'Línea 9', kind: 'linea', dailyTarget: 400 },
  { id: 'L10', name: 'Línea 10', kind: 'linea', dailyTarget: 450 },
  { id: 'CAJAS', name: 'Cajas', kind: 'area', dailyTarget: 300 },
  { id: 'DMT', name: 'DMT', kind: 'area', dailyTarget: 250 },
  { id: 'PAL', name: 'PAL', kind: 'area', dailyTarget: 200 },
  { id: 'ACC', name: 'ACC', kind: 'area', dailyTarget: 180 },
  { id: 'CONVEYOR', name: 'Conveyor', kind: 'area', dailyTarget: 350 },
]

export const LINES_ONLY = WORK_CENTERS.filter(w => w.kind === 'linea')

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
   del % de avance de produccion (una linea puede ir bien de
   produccion y aun asi estar "en atencion" por otro motivo). */
export const OPERATIONAL_STATUS = {
  OPERANDO: { label: 'Operando', dot: '#10B981', tone: 'ok' },
  ATENCION: { label: 'En atención', dot: '#F59E0B', tone: 'warn' },
  MANTENIMIENTO: { label: 'Mantenimiento', dot: '#3B82F6', tone: 'info' },
  DETENIDO: { label: 'Detenido', dot: '#EF4444', tone: 'bad' },
}

export function workCenterById(id) {
  return WORK_CENTERS.find(w => w.id === id)
}
