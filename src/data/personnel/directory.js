/* ─────────────────────────────────────────────
   Directorio base de empleados (catalogo tipo "RH") —
   NO representa asistencia ni ubicacion, solo numero+nombre.

   Esto es lo unico que se parece a "datos de ejemplo": un
   padron de numeros de empleado conocidos para que la
   busqueda/alta se sienta real desde el primer uso. A
   proposito NO incluye 2236 (se deja libre para probar el
   flujo de "empleado nuevo").
   ───────────────────────────────────────────── */

import { mulberry32, pick } from './prng'

const FIRST_NAMES = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Sofía', 'Jorge', 'Fernanda', 'Miguel', 'Daniela',
  'Roberto', 'Alejandra', 'Ricardo', 'Paola', 'José', 'Guadalupe', 'Francisco', 'Karla', 'Andrés', 'Brenda',
]

const LAST_NAMES = [
  'Pérez', 'López', 'García', 'Martínez', 'Hernández', 'González', 'Rodríguez', 'Sánchez', 'Ramírez', 'Torres',
  'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Morales', 'Cruz', 'Ortiz', 'Gutiérrez', 'Chávez',
]

/* Numeros usados como ejemplo en la especificacion del
   modulo — se dejan explicitos para que la demo funcione
   igual que los ejemplos. */
const KNOWN = [
  { employeeNumber: '3647', name: 'Román Herrera' },
  { employeeNumber: '3650', name: 'Juan Pérez' },
  { employeeNumber: '3821', name: 'María López' },
  { employeeNumber: '4012', name: 'Carlos García' },
]

function buildDirectory() {
  const list = KNOWN.map(k => ({
    id: `seed-${k.employeeNumber}`,
    employeeNumber: k.employeeNumber,
    name: k.name,
    status: 'Activo',
    createdAt: null,
  }))

  const used = new Set(list.map(e => e.employeeNumber))
  const rng = mulberry32(20260818)
  let n = 3600
  while (list.length < 36) {
    n += 1
    const number = String(n)
    if (used.has(number)) continue
    used.add(number)
    list.push({
      id: `seed-${number}`,
      employeeNumber: number,
      name: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      status: 'Activo',
      createdAt: null,
    })
  }
  return list
}

export const EMPLOYEE_DIRECTORY = buildDirectory()
