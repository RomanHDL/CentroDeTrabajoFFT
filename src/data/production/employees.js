import dayjs from 'dayjs'
import { WORK_CENTERS, STATIONS, CURRENT_SHIFT } from './catalog'
import { mulberry32, pick, randInt } from './mockSeed'

const FIRST_NAMES = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Sofía', 'Jorge', 'Fernanda', 'Miguel', 'Daniela',
  'Roberto', 'Alejandra', 'Ricardo', 'Paola', 'José', 'Guadalupe', 'Francisco', 'Karla', 'Andrés', 'Brenda',
  'Eduardo', 'Cecilia', 'Raúl', 'Mónica', 'Sergio', 'Patricia', 'Alberto', 'Diana', 'Manuel', 'Elena',
  'Iván', 'Gabriela', 'Rubén', 'Verónica', 'Arturo', 'Laura', 'Héctor', 'Rosa', 'Adrián', 'Silvia',
]

const LAST_NAMES = [
  'Pérez', 'López', 'García', 'Martínez', 'Hernández', 'González', 'Rodríguez', 'Sánchez', 'Ramírez', 'Torres',
  'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Morales', 'Cruz', 'Ortiz', 'Gutiérrez', 'Chávez',
  'Ramos', 'Vázquez', 'Castillo', 'Jiménez', 'Moreno', 'Romero', 'Álvarez', 'Herrera', 'Medina', 'Aguilar',
]

/* Personal por centro de trabajo — usa los numeros del
   mockup original donde estaban definidos (L1-L6, Cajas,
   DMT, PAL, ACC, Conveyor); L7-L10 completados con valores
   consistentes con el resto de las lineas. */
const PERSONNEL_COUNT = {
  L1: 18, L2: 16, L3: 14, L4: 17, L5: 15, L6: 12, L7: 16, L8: 14, L9: 15, L10: 17,
  CAJAS: 10, DMT: 8, PAL: 9, ACC: 7, CONVEYOR: 11,
}

const CAPACITY_EXTRA = {
  L1: 2, L2: 3, L3: 1, L4: 2, L5: 1, L6: 2, L7: 2, L8: 2, L9: 2, L10: 2,
  CAJAS: 2, DMT: 1, PAL: 2, ACC: 1, CONVEYOR: 2,
}

export function personnelCount(workCenterId) {
  return PERSONNEL_COUNT[workCenterId] || 10
}

export function capacityFor(workCenterId) {
  return personnelCount(workCenterId) + (CAPACITY_EXTRA[workCenterId] ?? 2)
}

function buildEmployees() {
  const rng = mulberry32(20260817)
  const list = []
  let employeeNumber = 3600

  WORK_CENTERS.forEach((wc) => {
    const count = personnelCount(wc.id)
    for (let i = 0; i < count; i += 1) {
      employeeNumber += 1
      const fullName = `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`
      const station = STATIONS[i % STATIONS.length]
      const shift = rng() < 0.88 ? CURRENT_SHIFT : pick(rng, ['Vespertino', 'Nocturno'])
      const isActive = rng() > 0.04
      const assignedAt = dayjs().hour(7).minute(randInt(rng, 0, 25)).second(0)

      list.push({
        id: `${wc.id}-${employeeNumber}`,
        employeeNumber: String(employeeNumber),
        fullName,
        workCenterId: wc.id,
        lineName: wc.name,
        station,
        shift,
        status: isActive ? 'Activo' : 'Inactivo',
        assignedAt: assignedAt.format('HH:mm'),
      })
    }
  })

  return list
}

export const EMPLOYEES = buildEmployees()

export function employeesByWorkCenter(workCenterId) {
  return EMPLOYEES.filter(e => e.workCenterId === workCenterId)
}

export function searchEmployees(query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  return EMPLOYEES.filter(e =>
    e.employeeNumber.includes(q) ||
    e.fullName.toLowerCase().includes(q)
  ).slice(0, 20)
}
