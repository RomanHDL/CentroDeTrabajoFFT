// Seed real de personal/areas/estaciones -- primera carga de datos reales para el backend de
// Personal (Fase 1 de la migracion a base de datos real, ver prisma/schema.prisma). Toma
// exactamente las mismas fuentes que hoy usa el frontend en localStorage, sin inventar nada
// nuevo: WORK_CENTERS (catalog.js) -> WorkArea, getWorkstationsForLine (workstations.js) ->
// Workstation, REAL_PERSONNEL_SNAPSHOT (realPersonnelSnapshot.js) -> Employee.
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/seed-personnel.mjs
// (o "npm run seed-personnel") -- el --import es necesario porque este script importa
// catalog.js/workstations.js/realPersonnelSnapshot.js de src/ tal cual estan, y esos usan
// imports relativos sin extension (validos para Vite, no para el resolver ESM estricto de Node);
// ver _esm-extensionless-loader.mjs para el porque no se toco nada de src/ en vez de esto.
//
// IDEMPOTENTE:
// - WorkArea: upsert por `code` (unico), code = WORK_CENTERS[].id tal cual (LINEA1, PROYECTO, ...).
// - Workstation: upsert por el unique compuesto [workAreaId, name] que ya existe en el schema.
// - Employee CON employeeNumber real: upsert por employeeNumber (unico).
// - Employee SIN employeeNumber real (el snapshot no confirmo numero -- ver directory.js, nunca
//   se escribe el string 'PENDIENTE'/'PROYECTO' en este campo, solo null): no hay una columna que
//   guarde el id del snapshot ("base-N"/"sem34-N"), asi que se busca una fila existente que
//   coincida en TODOS los campos que vienen del snapshot (employeeNumber: null, fullName,
//   areaZona, rawZona, actividad, baseAsistencia, fechaIngreso) y se actualiza; si no hay
//   coincidencia, se crea. Se verifico que estos 6 campos juntos son unicos dentro de las 136
//   filas del snapshot (ninguna fila sin numero es indistinguible de otra por este criterio), asi
//   que este script se puede correr varias veces sin duplicar personal.
import { prisma } from '../server-lib/prisma.js'
import { WORK_CENTERS, LINE_FAMILY_AREA_IDS } from '../src/data/production/catalog.js'
import { getWorkstationsForLine } from '../src/data/personnel/workstations.js'
import { REAL_PERSONNEL_SNAPSHOT } from '../src/data/production/realPersonnelSnapshot.js'
import { ROLE_TO_CATEGORY_KEY } from '../src/data/personnel/lineVisualType.js'

// "estaciones configurables por ADMINISTRADOR" (2026-08-27): backfillea role/
// requiredRoleLabel/category (columnas nuevas y aditivas de Workstation, ver
// prisma/schema.prisma) para cada estacion generada por getWorkstationsForLine
// -- ROLE_TO_CATEGORY_KEY es la MISMA tabla que usa el fallback de
// clasificacion en el cliente (lineVisualType.js), nunca duplicada. Ademas
// agrega el puesto "Team Leader" (posicion inicial, SIN ocupante -- nunca se
// inventa ni se mueve a nadie) en cada una de las 11 WC LINEA (0..10), mismo
// mecanismo/riesgo ya validado que "Calidad" (posicion 1) -- decision D2 del
// plan aprobado.
function categoryForRole(role) {
  return ROLE_TO_CATEGORY_KEY[role] || null
}

let workAreaCount = 0
let workstationCount = 0
let employeeCreated = 0
let employeeUpdated = 0

for (let i = 0; i < WORK_CENTERS.length; i += 1) {
  const wc = WORK_CENTERS[i]
  const workArea = await prisma.workArea.upsert({
    where: { code: wc.id },
    create: { code: wc.id, name: wc.name, displayOrder: i },
    update: { name: wc.name, displayOrder: i },
  })
  workAreaCount += 1

  const stations = getWorkstationsForLine(wc.id)
  for (const station of stations) {
    await prisma.workstation.upsert({
      where: { workAreaId_name: { workAreaId: workArea.id, name: station.name } },
      create: {
        workAreaId: workArea.id,
        name: station.name,
        capacity: station.capacity,
        displayOrder: station.order,
        role: station.role,
        requiredRoleLabel: station.requiredRole,
        category: categoryForRole(station.role),
      },
      update: {
        capacity: station.capacity,
        displayOrder: station.order,
        role: station.role,
        requiredRoleLabel: station.requiredRole,
        category: categoryForRole(station.role),
      },
    })
    workstationCount += 1
  }

  // Puesto "Team Leader" en cada WC LINEA 0..10 (LINE_FAMILY_AREA_IDS) --
  // posicion inicial (displayOrder 0, antes de Calidad), SIN ocupante hasta
  // que un ADMINISTRADOR/SUPERVISOR asigne a alguien real por el flujo de
  // asignacion existente (checkInEmployee/moveEmployee, sin cambios).
  if (LINE_FAMILY_AREA_IDS.has(wc.id)) {
    await prisma.workstation.upsert({
      where: { workAreaId_name: { workAreaId: workArea.id, name: 'Team Leader' } },
      create: {
        workAreaId: workArea.id,
        name: 'Team Leader',
        capacity: 1,
        displayOrder: 0,
        role: 'Team Leader',
        requiredRoleLabel: 'Team Leader',
        category: 'LIDERAZGO',
      },
      update: {
        role: 'Team Leader',
        requiredRoleLabel: 'Team Leader',
        category: 'LIDERAZGO',
      },
    })
    workstationCount += 1
  }
}

for (const p of REAL_PERSONNEL_SNAPSHOT) {
  const data = {
    employeeNumber: p.employeeNumber || null,
    fullName: p.name,
    areaZona: p.areaZona ?? null,
    rawZona: p.rawZona ?? null,
    actividad: p.actividad ?? null,
    baseAsistencia: p.asistencia ?? null,
    fechaIngreso: p.fechaIngreso ?? null,
    active: p.status === 'BAJA' ? false : true,
  }

  if (data.employeeNumber) {
    const result = await prisma.employee.upsert({
      where: { employeeNumber: data.employeeNumber },
      create: data,
      update: data,
    })
    if (result.createdAt.getTime() === result.updatedAt.getTime()) employeeCreated += 1
    else employeeUpdated += 1
    continue
  }

  const existing = await prisma.employee.findFirst({
    where: {
      employeeNumber: null,
      fullName: data.fullName,
      areaZona: data.areaZona,
      rawZona: data.rawZona,
      actividad: data.actividad,
      baseAsistencia: data.baseAsistencia,
      fechaIngreso: data.fechaIngreso,
    },
  })
  if (existing) {
    await prisma.employee.update({ where: { id: existing.id }, data })
    employeeUpdated += 1
  } else {
    await prisma.employee.create({ data })
    employeeCreated += 1
  }
}

console.log(`OK WorkArea: ${workAreaCount}`)
console.log(`OK Workstation: ${workstationCount}`)
console.log(`OK Employee: ${employeeCreated} creados, ${employeeUpdated} actualizados (total snapshot: ${REAL_PERSONNEL_SNAPSHOT.length})`)

await prisma.$disconnect()
