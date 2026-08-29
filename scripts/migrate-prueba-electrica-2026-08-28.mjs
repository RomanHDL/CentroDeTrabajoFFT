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
import { and, eq, sql } from 'drizzle-orm'
import { db, workArea, workstation, dailyAssignment } from '../server-lib/db/client.js'

async function deactivate(areaCode, name) {
  const [wa] = await db.select().from(workArea).where(eq(workArea.code, areaCode)).limit(1)
  if (!wa) {
    console.log(`  (omitido) WorkArea "${areaCode}" no existe`)
    return
  }
  const [w] = await db
    .select()
    .from(workstation)
    .where(and(eq(workstation.workAreaId, wa.id), eq(workstation.name, name)))
    .limit(1)
  if (!w) {
    console.log(`  (omitido) ${areaCode}: "${name}" no existe`)
    return
  }
  if (!w.active) {
    console.log(`  OK (ya desactivado) ${areaCode}: "${name}"`)
    return
  }
  const [{ count: active }] = await db
    .select({ count: sql`count(*)::int` })
    .from(dailyAssignment)
    .where(and(eq(dailyAssignment.workstationId, w.id), eq(dailyAssignment.status, 'ACTIVE')))
  await db.update(workstation).set({ active: false }).where(eq(workstation.id, w.id))
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
await db.$client.end()
