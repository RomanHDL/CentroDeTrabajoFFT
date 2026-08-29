/* ─────────────────────────────────────────────
   Capa de persistencia del modulo de Personal.

   Hoy vive en localStorage porque el proyecto no tiene
   backend propio; toda la lectura/escritura pasa POR AQUI
   para que el dia de manana sustituir esto por llamadas a
   una API real sea un cambio de un solo archivo (nadie mas
   importa localStorage directamente).
   ───────────────────────────────────────────── */

const KEYS = {
  employees: 'cp_employees_v1',
  assignments: 'cp_daily_assignments_v1',
  movements: 'cp_movements_v1',
  attendance: 'cp_attendance_v1',
  skills: 'cp_skills_v1',
  pendingMoves: 'cp_pending_moves_v1',
  baselineSuppressed: 'cp_baseline_suppressed_v1',
}

function readList(key) {
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento no disponible (modo privado, cuota llena, etc.) */
  }
}

export const readEmployees = () => readList(KEYS.employees)
export const writeEmployees = (rows) => writeList(KEYS.employees, rows)

export const readAssignments = () => readList(KEYS.assignments)
export const writeAssignments = (rows) => writeList(KEYS.assignments, rows)

export const readMovements = () => readList(KEYS.movements)
export const writeMovements = (rows) => writeList(KEYS.movements, rows)

/* Presencia (asistencia) — separada de la asignacion de
   estacion: alguien puede estar presente hoy sin todavia
   tener un puesto asignado. */
export const readAttendance = () => readList(KEYS.attendance)
export const writeAttendance = (rows) => writeList(KEYS.attendance, rows)

/* Habilidades del empleado (EmployeeSkill) — que puede hacer,
   no donde esta asignado hoy. */
export const readSkills = () => readList(KEYS.skills)
export const writeSkills = (rows) => writeList(KEYS.skills, rows)

/* Movimientos que un LIDER pide pero todavia no se aplican — quedan
   aqui hasta que un SUPERVISOR/ADMINISTRADOR los aprueba o rechaza
   (peticion explicita del usuario: un lider nunca reubica gente sin
   verificacion). Separado de `movements` (que es el historial de lo
   que YA ocurrio de verdad). */
export const readPendingMoves = () => readList(KEYS.pendingMoves)
export const writePendingMoves = (rows) => writeList(KEYS.pendingMoves, rows)

/* IDs de personal cuya ubicacion HISTORICA (snapshot BASE) se ignora
   a proposito, SIN fecha de vencimiento — a diferencia de un
   movimiento/liberacion normal (que solo aplica "por hoy" y al otro
   dia la persona vuelve a aparecer en su zona de BASE), esto se
   queda vacio indefinidamente hasta que alguien reciba una
   asignacion real de verdad (checkInEmployee/moveEmployee ya lo
   quita de esta lista, ver repository.js). Se agrego 2026-08-21
   porque el usuario pidio explicitamente que el layout se vea en
   blanco para que los lideres reubiquen a todos, y un reset "de solo
   hoy" se revertia solo al cambiar de dia. */
export const readBaselineSuppressed = () => readList(KEYS.baselineSuppressed)
export const writeBaselineSuppressed = (rows) => writeList(KEYS.baselineSuppressed, rows)

/* ── Suscripcion simple para que la UI se refresque cuando cambian
   datos de personal — sea por una escritura local (checkInEmployee,
   etc.) o por la fusion periodica del backend real (ver apiSync.js,
   Fase 2 de la migracion). Vive aqui (no en repository.js) para que
   apiSync.js pueda llamar notify() sin crear un import circular con
   repository.js. ── */
const listeners = new Set()
export function notify() {
  listeners.forEach((fn) => fn())
}
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* notify() de arriba solo cubre cambios hechos DESDE esta misma pestaña.
   El navegador SI dispara un evento 'storage' nativo en las OTRAS
   pestañas/ventanas del MISMO origen cuando localStorage cambia (nunca
   en la pestaña que escribio) — esto cubre "dos pestañas del mismo
   navegador"; dispositivos distintos se cubren aparte via apiSync.js
   (sondeo del backend real). Filtra por prefijo 'cp_' para no
   reaccionar a cambios de localStorage ajenos a este modulo. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('cp_')) notify()
  })
}
