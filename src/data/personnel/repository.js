import dayjs from 'dayjs'
import {
  readEmployees, writeEmployees, readAssignments, writeAssignments, readMovements, writeMovements,
  readAttendance, writeAttendance, readSkills, writeSkills,
} from './store'
import { EMPLOYEE_DIRECTORY, isEmployeeEligible } from './directory'
import { SEED_SKILLS } from './skills'
import { getWorkstationsForLine, getWorkstation } from './workstations'
import { CURRENT_SHIFT } from '../production/catalog'

/* ─────────────────────────────────────────────
   Modelo conceptual:

   Employee            -> SOLO la persona (id, employeeNumber, name, status, createdAt)
   DailyAssignment     -> UNA fila por (employeeId, date): su ubicacion vigente ese dia
   EmployeeMovement    -> historial append-only de entradas/movimientos (nunca se borra)

   Un empleado jamas tiene lineId/stationId fijos — eso vive
   unicamente en la asignacion del dia. Moverlo actualiza la
   fila de DailyAssignment de HOY y agrega una fila nueva en
   EmployeeMovement; nunca se sobreescribe ni se borra un
   movimiento anterior.
   ───────────────────────────────────────────── */

export const todayISO = () => dayjs().format('YYYY-MM-DD')
const nowTime = () => dayjs().format('HH:mm')
const nowISO = () => dayjs().toISOString()

let seq = 0
function makeId(prefix) {
  seq += 1
  return `${prefix}-${Date.now()}-${seq}`
}

/* ── Suscripcion simple para que la UI se refresque cuando
   cambian datos guardados fuera de su propio render (p. ej.
   un registro hecho desde otro componente/dialogo). ── */
const listeners = new Set()
function notify() { listeners.forEach(fn => fn()) }
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* ── Employee ── */

export function getAllEmployees() {
  const dynamic = readEmployees()
  const known = new Set(dynamic.map(e => e.employeeNumber))
  return [...dynamic, ...EMPLOYEE_DIRECTORY.filter(e => !known.has(e.employeeNumber))]
}

export function getEmployeeByNumber(employeeNumber) {
  const number = String(employeeNumber || '').trim()
  if (!number) return null
  const dynamic = readEmployees().find(e => e.employeeNumber === number)
  if (dynamic) return dynamic
  return EMPLOYEE_DIRECTORY.find(e => e.employeeNumber === number) || null
}

export function getEmployeeById(employeeId) {
  return getAllEmployees().find(e => e.id === employeeId) || null
}

/* Unico selector centralizado de "personal que puede aparecer en
   busqueda/sugerencias/disponibles/registro" — todo lo demas
   (searchEmployees, getSuggestedCandidates, disponibles en el
   layout) filtra a traves de este, nunca con su propia regla ad
   hoc. getAllEmployees() sigue devolviendo TODOS (incluye bajas)
   porque el historial/auditoria/resolucion de asignaciones ya
   existentes debe seguir funcionando para cualquier persona,
   elegible o no. */
export function getAssignableEmployees() {
  return getAllEmployees().filter(isEmployeeEligible)
}

export function createEmployee({ employeeNumber, name }) {
  const number = String(employeeNumber).trim()
  const employees = readEmployees()
  const employee = {
    id: makeId('emp'),
    employeeNumber: number,
    name: name.trim(),
    status: 'Activo',
    createdAt: nowISO(),
  }
  employees.push(employee)
  writeEmployees(employees)
  notify()
  return employee
}

export function searchEmployees(query, limit = 20) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  return getAssignableEmployees()
    .filter(e => e.employeeNumber.includes(q) || e.name.toLowerCase().includes(q))
    .slice(0, limit)
}

/* ── Skills (EmployeeSkill) — de que esta capacitado, no de
   donde esta asignado hoy. ── */

export function getSkillsForEmployee(employeeId) {
  const dynamic = readSkills().filter(s => s.employeeId === employeeId)
  const seenStations = new Set(dynamic.map(s => s.stationName))
  const seeded = SEED_SKILLS.filter(s => s.employeeId === employeeId && !seenStations.has(s.stationName))
  return [...dynamic, ...seeded].filter(s => s.active !== false)
}

export function hasSkill(employeeId, stationName) {
  return getSkillsForEmployee(employeeId).some(s => s.stationName === stationName)
}

export function addSkill({ employeeId, stationName, level = 'PUEDE_CUBRIR' }) {
  const skills = readSkills()
  const skill = { id: makeId('skl'), employeeId, stationName, level, active: true, createdAt: nowISO() }
  skills.push(skill)
  writeSkills(skills)
  notify()
  return skill
}

/* ── Attendance (presencia) — separada de la asignacion de
   estacion. Un empleado puede estar presente hoy y todavia
   no tener puesto. ── */

export function getAttendanceForDate(date = todayISO()) {
  return readAttendance().filter(a => a.date === date)
}

export function isPresentToday(employeeId, date = todayISO()) {
  return getAttendanceForDate(date).some(a => a.employeeId === employeeId)
}

function ensureAttendance(employee, date, shift) {
  const attendance = readAttendance()
  const existing = attendance.find(a => a.employeeId === employee.id && a.date === date)
  if (existing) return existing
  const record = {
    id: makeId('att'),
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    date,
    shift,
    checkedInAt: nowTime(),
  }
  attendance.push(record)
  writeAttendance(attendance)
  return record
}

/**
 * Marca a un empleado presente HOY sin asignarle estacion
 * todavia (util para pase de lista rapido en la manana antes
 * de acomodar a cada quien). Idempotente: si ya esta
 * presente, no duplica.
 */
export function markPresentOnly({ employeeNumber, name, shift }) {
  const number = String(employeeNumber || '').trim()
  if (!number) return { status: 'ERROR', message: 'Captura un número de empleado.' }

  let employee = getEmployeeByNumber(number)
  if (!employee) {
    if (!name || !name.trim()) return { status: 'NEEDS_NAME', employeeNumber: number }
    employee = createEmployee({ employeeNumber: number, name })
  }

  const date = todayISO()
  const already = isPresentToday(employee.id, date)
  const attendance = ensureAttendance(employee, date, shift)
  notify()
  return { status: already ? 'ALREADY_PRESENT' : 'OK', employee, attendance }
}

/* ── Daily assignment (ubicacion vigente por dia) ── */

export function getCurrentAssignment(employeeId, date = todayISO()) {
  return readAssignments().find(a => a.employeeId === employeeId && a.date === date) || null
}

export function getAssignmentsForDate(date = todayISO()) {
  return readAssignments().filter(a => a.date === date)
}

export function getAssignmentsForArea(areaId, date = todayISO()) {
  return getAssignmentsForDate(date).filter(a => a.areaId === areaId)
}

export function getAssignmentHistory(employeeId) {
  return readAssignments()
    .filter(a => a.employeeId === employeeId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/* Roster de HOY, ya con el empleado resuelto — listo para
   tablas de "Personal de la linea" / "Personal de hoy". */
export function getTodayRoster(date = todayISO()) {
  const employeesById = new Map(getAllEmployees().map(e => [e.id, e]))
  return getAssignmentsForDate(date)
    .map(a => ({ ...a, employee: employeesById.get(a.employeeId) || null }))
    .sort((a, b) => (a.checkInAt > b.checkInAt ? -1 : 1))
}

export function getRosterForArea(areaId, date = todayISO()) {
  return getTodayRoster(date).filter(r => r.areaId === areaId)
}

/* ── Contadores (personal REAL, no mock) ── */

export function getAreaCountsForDate(date = todayISO()) {
  const counts = {}
  getAssignmentsForDate(date).forEach((a) => { counts[a.areaId] = (counts[a.areaId] || 0) + 1 })
  return counts
}

export function getAreaCountToday(areaId) {
  return getAreaCountsForDate()[areaId] || 0
}

/* Empleados unicos presentes hoy — union de asistencia (con o
   sin puesto) y asignaciones, para no perder a alguien que ya
   se registro presente pero todavia no tiene estacion. Un
   movimiento NUNCA cuenta como persona adicional (una sola
   fila de asignacion por empleado por dia, por construccion). */
export function getPersonnelPresentToday(date = todayISO()) {
  const ids = new Set()
  getAttendanceForDate(date).forEach(a => ids.add(a.employeeId))
  getAssignmentsForDate(date).forEach(a => ids.add(a.employeeId))
  return ids.size
}

export function getPersonnelCountForDate(date) {
  const ids = new Set()
  getAttendanceForDate(date).forEach(a => ids.add(a.employeeId))
  getAssignmentsForDate(date).forEach(a => ids.add(a.employeeId))
  return ids.size
}

/* Presentes hoy sin estacion asignada todavia — para la
   seccion "Personal sin asignacion hoy". */
export function getUnassignedPresentToday(date = todayISO()) {
  const assignedIds = new Set(getAssignmentsForDate(date).map(a => a.employeeId))
  const employeesById = new Map(getAllEmployees().map(e => [e.id, e]))
  return getAttendanceForDate(date)
    .filter(a => !assignedIds.has(a.employeeId))
    .map(a => ({ ...a, employee: employeesById.get(a.employeeId) || null }))
}

export function getLinesWithPersonnelToday() {
  return Object.keys(getAreaCountsForDate()).length
}

/* ── Capacidad / ocupacion por estacion (evita sobrecupo) ── */

export function getStationOccupancy(areaId, stationName, date = todayISO(), excludeEmployeeId = null) {
  const workstation = getWorkstation(areaId, stationName)
  const capacity = workstation ? workstation.capacity : 1
  const count = getAssignmentsForArea(areaId, date)
    .filter(a => a.stationId === stationName && a.employeeId !== excludeEmployeeId).length
  return { count, capacity, isFull: count >= capacity }
}

export function getLineCapacitySummary(lineId, date = todayISO()) {
  const capacityTotal = getWorkstationsForLine(lineId).reduce((sum, w) => sum + w.capacity, 0)
  const occupied = getAssignmentsForArea(lineId, date).length
  return { capacityTotal, occupied, available: Math.max(0, capacityTotal - occupied), isFull: occupied >= capacityTotal }
}

/* Estaciones de una linea ya combinadas con quien las ocupa
   hoy — listo para pintar la distribucion visual. */
export function getLineWorkstationsWithOccupancy(lineId, date = todayISO()) {
  const assignments = getAssignmentsForArea(lineId, date)
  const employeesById = new Map(getAllEmployees().map(e => [e.id, e]))
  return getWorkstationsForLine(lineId)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((w) => {
      const occupants = assignments
        .filter(a => a.stationId === w.name)
        .map(a => ({ ...a, employee: employeesById.get(a.employeeId) || null }))
      return { ...w, occupants, isFull: occupants.length >= w.capacity, isAvailable: occupants.length < w.capacity }
    })
}

export function getLastAssignment(employeeId, excludeDate = todayISO()) {
  return readAssignments()
    .filter(a => a.employeeId === employeeId && a.date !== excludeDate)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0] || null
}

/**
 * Candidatos compatibles con una estacion vacia, en orden
 * deterministico (sin IA): presente+sin asignacion primero,
 * presente+asignado en otra area despues, ausentes solo si se
 * piden explicitamente. Nunca inventa nombres: solo empleados
 * reales con la habilidad registrada.
 */
export function getSuggestedCandidates(lineId, stationName, { includeAbsent = false, limit = 20 } = {}) {
  const date = todayISO()
  const presentIds = new Set()
  getAttendanceForDate(date).forEach(a => presentIds.add(a.employeeId))
  getAssignmentsForDate(date).forEach(a => presentIds.add(a.employeeId))
  const assignmentByEmployee = new Map(getAssignmentsForDate(date).map(a => [a.employeeId, a]))

  const candidates = getAssignableEmployees()
    .filter(e => hasSkill(e.id, stationName))
    .map((e) => {
      const present = presentIds.has(e.id)
      const assignment = assignmentByEmployee.get(e.id) || null
      const priority = present && !assignment ? 1 : present && assignment ? 2 : 3
      return { employee: e, present, assignment, priority }
    })
    .filter(c => !(c.assignment && c.assignment.areaId === lineId && c.assignment.stationId === stationName))
    .filter(c => includeAbsent || c.priority <= 2)
    .sort((a, b) => a.priority - b.priority || a.employee.employeeNumber.localeCompare(b.employee.employeeNumber))

  return candidates.slice(0, limit)
}

export function getAverageHeadcountForArea(areaId) {
  const assignments = readAssignments().filter(a => a.areaId === areaId)
  if (!assignments.length) return 0
  const byDate = {}
  assignments.forEach((a) => { byDate[a.date] = (byDate[a.date] || 0) + 1 })
  const days = Object.values(byDate)
  return Math.round((days.reduce((s, c) => s + c, 0) / days.length) * 10) / 10
}

/* ── Movements (historial append-only) ── */

export function getMovementsForEmployee(employeeId, date) {
  return readMovements()
    .filter(m => m.employeeId === employeeId && (!date || m.date === date))
    .sort((a, b) => (a.movedAt < b.movedAt ? -1 : a.movedAt > b.movedAt ? 1 : 0))
}

export function getMovementsForDate(date = todayISO()) {
  return readMovements().filter(m => m.date === date)
}

export function getMovesCountForDate(date = todayISO()) {
  return getMovementsForDate(date).filter(m => m.type === 'MOVE').length
}

/* ── Acciones (unico lugar que escribe asignaciones/movimientos) ── */

/**
 * Registra a un empleado en un area/estacion HOY.
 * - Si el numero no existe: status NEEDS_NAME (crear con {employeeNumber, name} y reintentar).
 * - Si ya tiene una asignacion activa hoy: status CONFLICT (nunca se sobreescribe silenciosamente).
 * - Si todo esta bien: crea DailyAssignment + EmployeeMovement (type CHECK_IN) y devuelve OK.
 *
 * employeeId (opcional): cuando quien llama ya tiene resuelto un
 * empleado especifico (p. ej. de un resultado de busqueda), pasarlo
 * evita resolver por employeeNumber. Esto importa porque el
 * snapshot real de BASE trae decenas de personas con el mismo
 * employeeNumber literal 'PENDIENTE' (no tienen numero real
 * todavia) — buscar por numero en ese caso encontraria a la
 * PRIMERA persona con ese numero, no a la que el usuario eligio.
 */
export function checkInEmployee({ employeeId, employeeNumber, name, areaId, stationId, shift }) {
  const number = String(employeeNumber || '').trim()
  if (!employeeId && !number) return { status: 'ERROR', message: 'Captura un número de empleado.' }
  if (!areaId) return { status: 'ERROR', message: 'Selecciona el área/línea.' }
  if (!stationId) return { status: 'ERROR', message: 'Selecciona el rol/estación.' }

  let employee = employeeId ? getEmployeeById(employeeId) : getEmployeeByNumber(number)
  if (!employee) {
    if (employeeId) return { status: 'ERROR', message: 'Empleado no encontrado.' }
    if (!name || !name.trim()) {
      return { status: 'NEEDS_NAME', employeeNumber: number }
    }
    employee = createEmployee({ employeeNumber: number, name })
  }

  const date = todayISO()
  const assignments = readAssignments()
  const existing = assignments.find(a => a.employeeId === employee.id && a.date === date)
  if (existing) {
    return { status: 'CONFLICT', employee, assignment: existing }
  }

  const occupancy = getStationOccupancy(areaId, stationId, date)
  if (occupancy.isFull) {
    return { status: 'STATION_FULL', message: `${stationId} ya está completa (${occupancy.count}/${occupancy.capacity}).`, occupancy }
  }

  const checkInAt = nowTime()
  const assignment = {
    id: makeId('asg'),
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    date,
    shift,
    areaId,
    stationId,
    checkInAt,
    status: 'PRESENTE',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  assignments.push(assignment)
  writeAssignments(assignments)
  ensureAttendance(employee, date, shift)

  const movements = readMovements()
  movements.push({
    id: makeId('mov'),
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    date,
    fromAreaId: null,
    fromStationId: null,
    toAreaId: areaId,
    toStationId: stationId,
    movedAt: checkInAt,
    shift,
    movedBy: null,
    type: 'CHECK_IN',
  })
  writeMovements(movements)

  notify()
  return { status: 'OK', employee, assignment }
}

/**
 * Mueve a un empleado YA asignado hoy a otra area/estacion.
 * Actualiza su DailyAssignment de hoy (una sola ubicacion
 * vigente a la vez) y agrega un EmployeeMovement (type MOVE)
 * sin tocar el movimiento anterior.
 */
export function moveEmployee({ employeeId, toAreaId, toStationId, shift }) {
  if (!toAreaId) return { status: 'ERROR', message: 'Selecciona el área/línea destino.' }
  if (!toStationId) return { status: 'ERROR', message: 'Selecciona el rol/estación destino.' }

  const date = todayISO()
  const assignments = readAssignments()
  const idx = assignments.findIndex(a => a.employeeId === employeeId && a.date === date)
  if (idx === -1) {
    return { status: 'ERROR', message: 'El empleado no tiene una asignación activa hoy.' }
  }

  const current = assignments[idx]

  const occupancy = getStationOccupancy(toAreaId, toStationId, date, employeeId)
  if (occupancy.isFull) {
    return { status: 'STATION_FULL', message: `${toStationId} ya está completa (${occupancy.count}/${occupancy.capacity}).`, occupancy }
  }

  const movedAt = nowTime()

  const movements = readMovements()
  movements.push({
    id: makeId('mov'),
    employeeId,
    employeeNumber: current.employeeNumber,
    date,
    fromAreaId: current.areaId,
    fromStationId: current.stationId,
    toAreaId,
    toStationId,
    movedAt,
    shift: shift || current.shift,
    movedBy: null,
    type: 'MOVE',
  })
  writeMovements(movements)

  const updated = { ...current, areaId: toAreaId, stationId: toStationId, shift: shift || current.shift, updatedAt: nowISO() }
  assignments[idx] = updated
  writeAssignments(assignments)

  notify()
  return { status: 'OK', assignment: updated, movedAt }
}

/**
 * Libera el puesto de un empleado sin quitarlo de "presente
 * hoy" (queda en Personal sin asignacion). Conserva el
 * historial: agrega un movimiento tipo RELEASE, no borra nada.
 *
 * fallbackFromAreaId: cubre a alguien que HOY todavia nadie ha
 * tocado (aparece en un area solo por su zona del snapshot de BASE,
 * nunca tuvo un DailyAssignment real) — no hay fila que borrar,
 * pero igual se registra el movimiento RELEASE (con el area de
 * origen que quien llama ya conoce, p. ej. desde getPeopleByArea)
 * para que quede "tocado" hoy y deje de contarse ahi. Si hay una
 * asignacion real activa, esta SIEMPRE tiene prioridad y el
 * fallback se ignora.
 */
export function releaseAssignment(employeeId, fallbackFromAreaId = null) {
  const date = todayISO()
  const employee = getEmployeeById(employeeId)
  const assignments = readAssignments()
  const idx = assignments.findIndex(a => a.employeeId === employeeId && a.date === date)

  let fromAreaId = fallbackFromAreaId
  let fromStationId = null
  let shift = CURRENT_SHIFT

  if (idx !== -1) {
    const current = assignments[idx]
    fromAreaId = current.areaId
    fromStationId = current.stationId
    shift = current.shift
    assignments.splice(idx, 1)
    writeAssignments(assignments)
    if (employee) ensureAttendance(employee, date, current.shift)
  } else if (!fallbackFromAreaId) {
    return { status: 'ERROR', message: 'El empleado no tiene una ubicación asignada hoy.' }
  }

  const movements = readMovements()
  movements.push({
    id: makeId('mov'),
    employeeId,
    employeeNumber: employee?.employeeNumber,
    date,
    fromAreaId,
    fromStationId,
    toAreaId: null,
    toStationId: null,
    movedAt: nowTime(),
    shift,
    movedBy: null,
    type: 'RELEASE',
  })
  writeMovements(movements)

  notify()
  return { status: 'OK' }
}
