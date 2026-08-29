// Migracion real (Postgres) -- 2026-08-28, cuarta ronda, a peticion explicita del usuario:
// "en 7 lineas de 10 hay 2 de prueba electrica, elimina la 2, solo debe ver 1 en las 11 lineas".
//
// Desactiva (soft-delete, NUNCA DELETE fisico) la estacion "Prueba eléctrica 2" en las 7 lineas
// donde existia (PROYECTO/WC LINEA0, LINEA1, LINEA6, LINEA7, LINEA8, LINEA9, LINEA10). Si alguien
// real la ocupaba, su asignacion NUNCA se toca aqui -- sigue exactamente igual en la base de
// datos, solo deja de encontrar una estacion activa que la reclame (aparece en "Personal sin
// estación" o se reconcilia sola a la estacion libre nueva que el siguiente `npm run
// seed-personnel` crea en su lugar -- Suministro de Accesorios 2 en LINEA1, Montaje 3 en PROYECTO,
// Limpieza de TV 2 en LINEA6-10 -- mismo mecanismo ya probado, nunca escrito por este script).
//
// IDEMPOTENTE: si ya se corrio antes, no hace nada (revisa `active` antes de tocar).
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/migrate-prueba-electrica-2026-08-28.mjs
import { prisma } from '../server-lib/prisma.js'

async function deactivate(areaCode, name) {
  const wa = await prisma.workArea.findUnique({ where: { code: areaCode } })
  if (!wa) {
    console.log(`  (omitido) WorkArea "${areaCode}" no existe`)
    return
  }
  const w = await prisma.workstation.findUnique({
    where: { workAreaId_name: { workAreaId: wa.id, name } },
  })
  if (!w) {
    console.log(`  (omitido) ${areaCode}: "${name}" no existe`)
    return
  }
  if (!w.active) {
    console.log(`  OK (ya desactivado) ${areaCode}: "${name}"`)
    return
  }
  const active = await prisma.dailyAssignment.count({
    where: { workstationId: w.id, status: 'ACTIVE' },
  })
  await prisma.workstation.update({ where: { id: w.id }, data: { active: false } })
  console.log(
    `  DESACTIVADO ${areaCode}: "${name}" (ocupacion activa preservada, nunca tocada: ${active})`,
  )
}

const LINEAS_CON_PRUEBA_ELECTRICA_2 = [
  'PROYECTO',
  'LINEA1',
  'LINEA6',
  'LINEA7',
  'LINEA8',
  'LINEA9',
  'LINEA10',
]

console.log('--- Desactivar "Prueba eléctrica 2" en las 7 lineas donde existia ---')
for (const areaCode of LINEAS_CON_PRUEBA_ELECTRICA_2) {
  await deactivate(areaCode, 'Prueba eléctrica 2')
}

console.log(
  '\nListo. Siguiente paso: npm run seed-personnel (crea las estaciones nuevas que reemplazan el hueco liberado y sincroniza role/category de TODAS las estaciones de WC LINEA).',
)
await prisma.$disconnect()
