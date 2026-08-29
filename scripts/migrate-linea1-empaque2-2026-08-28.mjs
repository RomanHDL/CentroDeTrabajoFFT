// Migracion real (Postgres) -- 2026-08-28, quinta ronda, a peticion explicita del usuario:
// "en WC LINEA 1 elimina Empaque 2".
//
// Desactiva (soft-delete, NUNCA DELETE fisico) la estacion "Empaque 2" en LINEA1. Si alguien
// real la ocupaba, su asignacion NUNCA se toca aqui -- sigue exactamente igual en la base de
// datos, solo deja de encontrar una estacion activa que la reclame (aparece en "Personal sin
// estación" o se reconcilia sola a la estacion libre nueva que el siguiente
// `npm run seed-personnel` genere -- mismo mecanismo ya probado, nunca escrito por este script).
//
// IDEMPOTENTE: si ya se corrio antes, no hace nada (revisa `active` antes de tocar).
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/migrate-linea1-empaque2-2026-08-28.mjs
import { prisma } from '../server-lib/prisma.js'

async function deactivate(areaCode, name) {
  const wa = await prisma.workArea.findUnique({ where: { code: areaCode } })
  if (!wa) { console.log(`  (omitido) WorkArea "${areaCode}" no existe`); return }
  const w = await prisma.workstation.findUnique({ where: { workAreaId_name: { workAreaId: wa.id, name } } })
  if (!w) { console.log(`  (omitido) ${areaCode}: "${name}" no existe`); return }
  if (!w.active) { console.log(`  OK (ya desactivado) ${areaCode}: "${name}"`); return }
  const active = await prisma.dailyAssignment.count({ where: { workstationId: w.id, status: 'ACTIVE' } })
  await prisma.workstation.update({ where: { id: w.id }, data: { active: false } })
  console.log(`  DESACTIVADO ${areaCode}: "${name}" (ocupacion activa preservada, nunca tocada: ${active})`)
}

console.log('--- WC LINEA 1: Empaque 2 ---')
await deactivate('LINEA1', 'Empaque 2')

console.log('\nListo. Siguiente paso: npm run seed-personnel (sincroniza role/category/active de TODAS las estaciones de WC LINEA con el generador actual).')
await prisma.$disconnect()
