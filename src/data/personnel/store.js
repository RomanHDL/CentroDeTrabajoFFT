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
