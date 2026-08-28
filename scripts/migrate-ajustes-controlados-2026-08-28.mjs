// Migracion real (Postgres) para la tarea "ajustes controlados" (2026-08-28,
// a peticion explicita del usuario). Se corre UNA vez, DESPUES de los
// cambios de catalog.js/workstations.js/lineVisualType.js y ANTES de
// `npm run seed-personnel` (ese script solo hace upsert por nombre -- si
// corriera primero, un rename como "Limpieza"->"Limpieza de TV" crearia una
// fila NUEVA en vez de renombrar la existente, dejando la vieja huerfana).
//
// Dos tipos de operacion, nunca mezclados:
// 1) RENAME EN SITIO (preserva DailyAssignment/EmployeeMovement/historial
//    intactos -- el FK es por Workstation.id, nunca por `name`, asi que
//    renombrar el campo `name` de la MISMA fila no rompe ninguna relacion
//    ni desasigna a nadie que ya estuviera ahi):
//    - WC LINEA 0-10: "Limpieza" -> "Limpieza de TV"
//    - WC Insumos: "Ayudante General — Dry Ice" -> "Ayudante General — Protectores Espuma"
//    - WC Paletizado: "Ayudante General Conveyor 1/2" -> "Ayudante General de Conveyor 1/2"
// 2) DESACTIVAR (soft-delete, active:false -- NUNCA DELETE fisico, hay FK
//    real desde DailyAssignment/EmployeeMovement que lo bloquearia de todos
//    modos): estaciones redundantes que se eliminan de verdad. Si alguien
//    las ocupaba, su asignacion real NUNCA se toca aqui -- sigue exactamente
//    igual en la base de datos, solo deja de encontrar una estacion activa
//    que la reclame y aparece solo en "Personal sin estación" (derivado,
//    ver getPeopleWithoutStation) la proxima vez que se abra el detalle real
//    de esa WC en el navegador -- este script NUNCA escribe DailyAssignment.
//    - WC LINEA 1: "Montaje 2", "Etiquetado 2"
//    - WC Paletizado: "Conveyor 1", "Conveyor 2" (rol generico "Conveyor",
//      reemplazado por "Ayudante General de Conveyor")
//    - WC Conveyor General (CONVEYOR_PRINCIPAL): "Puesto 1".."Puesto 4" (las
//      que existan) -- ya no tiene puestos propios, se fusiono en Paletizado.
//
// IDEMPOTENTE: si ya se corrio antes, cada paso revisa el estado actual
// antes de actuar (no hace nada si el nombre nuevo ya existe / el nombre
// viejo ya no existe / la fila ya esta active:false).
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/migrate-ajustes-controlados-2026-08-28.mjs
import { prisma } from '../server-lib/prisma.js'

async function findArea(code) {
  const wa = await prisma.workArea.findUnique({ where: { code } })
  if (!wa) console.log(`  (omitido: WorkArea "${code}" no existe todavia en esta DB)`)
  return wa
}

async function renameInPlace(areaCode, oldName, newName, { role, requiredRoleLabel, category } = {}) {
  const wa = await findArea(areaCode)
  if (!wa) return
  const already = await prisma.workstation.findUnique({ where: { workAreaId_name: { workAreaId: wa.id, name: newName } } })
  if (already) { console.log(`  OK (ya renombrado) ${areaCode}: "${newName}"`); return }
  const old = await prisma.workstation.findUnique({ where: { workAreaId_name: { workAreaId: wa.id, name: oldName } } })
  if (!old) { console.log(`  (omitido) ${areaCode}: "${oldName}" no existe (nada que renombrar)`); return }
  const active = await prisma.dailyAssignment.count({ where: { workstationId: old.id, status: 'ACTIVE' } })
  await prisma.workstation.update({
    where: { id: old.id },
    data: {
      name: newName,
      ...(role !== undefined ? { role } : {}),
      ...(requiredRoleLabel !== undefined ? { requiredRoleLabel } : {}),
      ...(category !== undefined ? { category } : {}),
    },
  })
  console.log(`  RENOMBRADO ${areaCode}: "${oldName}" -> "${newName}" (ocupacion activa preservada: ${active})`)
}

async function deactivate(areaCode, name) {
  const wa = await findArea(areaCode)
  if (!wa) return
  const w = await prisma.workstation.findUnique({ where: { workAreaId_name: { workAreaId: wa.id, name } } })
  if (!w) { console.log(`  (omitido) ${areaCode}: "${name}" no existe`); return }
  if (!w.active) { console.log(`  OK (ya desactivado) ${areaCode}: "${name}"`); return }
  const active = await prisma.dailyAssignment.count({ where: { workstationId: w.id, status: 'ACTIVE' } })
  await prisma.workstation.update({ where: { id: w.id }, data: { active: false } })
  console.log(`  DESACTIVADO ${areaCode}: "${name}" (ocupacion activa preservada, nunca tocada: ${active})`)
}

console.log('--- 1) Renombrar "Limpieza"/"Limpieza 2" -> "Limpieza de TV"/"Limpieza de TV 2" en WC LINEA 0-10 ---')
// "Limpieza 2" solo existe hoy en PROYECTO (WC LINEA 0, la unica linea que repite las 5 posiciones
// base completas) pero se recorre en las 11 por si alguna otra la llegara a tener -- renameInPlace ya
// es un no-op seguro si el nombre viejo no existe. IMPORTANTE (bug real encontrado en la primera
// corrida): correr `npm run seed-personnel` ANTES de renombrar el sufijo "2" crea una fila NUEVA
// "Limpieza de TV 2" vacia (el generador ya no produce "Limpieza 2") mientras la fila REAL con
// historial se queda atras con el nombre viejo -- por eso este paso renombra AMBOS sufijos (sin
// sufijo y "2") ANTES de seed-personnel, nunca despues.
for (const areaCode of ['PROYECTO', 'LINEA1', 'LINEA2', 'LINEA3', 'LINEA4', 'LINEA5', 'LINEA6', 'LINEA7', 'LINEA8', 'LINEA9', 'LINEA10']) {
  await renameInPlace(areaCode, 'Limpieza', 'Limpieza de TV', { role: 'Limpieza de TV', requiredRoleLabel: 'Auxiliar de Limpieza' })
  await renameInPlace(areaCode, 'Limpieza 2', 'Limpieza de TV 2', { role: 'Limpieza de TV', requiredRoleLabel: 'Auxiliar de Limpieza' })
}

console.log('--- 2) Renombrar "Dry Ice" -> "Protectores Espuma" en WC Insumos ---')
await renameInPlace(
  'INSUMOS',
  'Ayudante General — Dry Ice',
  'Ayudante General — Protectores Espuma',
  { role: 'Ayudante General — Protectores Espuma', requiredRoleLabel: 'Ayudante General — Protectores Espuma' }
)

console.log('--- 3) Renombrar "Ayudante General Conveyor N" -> "Ayudante General de Conveyor N" en WC Paletizado ---')
for (const n of [1, 2]) {
  await renameInPlace(
    'PALETIZADO',
    `Ayudante General Conveyor ${n}`,
    `Ayudante General de Conveyor ${n}`,
    { role: 'Ayudante General de Conveyor', requiredRoleLabel: 'Ayudante General de Conveyor' }
  )
}

console.log('--- 4) Desactivar "Montaje 2"/"Etiquetado 2" en WC LINEA 1 ---')
await deactivate('LINEA1', 'Montaje 2')
await deactivate('LINEA1', 'Etiquetado 2')

console.log('--- 5) Desactivar rol generico "Conveyor" (Conveyor 1/2) en WC Paletizado -- reemplazado por "Ayudante General de Conveyor" ---')
await deactivate('PALETIZADO', 'Conveyor 1')
await deactivate('PALETIZADO', 'Conveyor 2')

console.log('--- 6) Desactivar puestos propios de WC Conveyor General (fusionado en Paletizado, ya no tiene puestos aparte) ---')
for (const n of [1, 2, 3, 4]) {
  await deactivate('CONVEYOR_PRINCIPAL', `Puesto ${n}`)
}

console.log('\nListo. Siguiente paso: npm run seed-personnel (crea los puestos nuevos -- Empaque -- y sincroniza role/category del resto).')
await prisma.$disconnect()
