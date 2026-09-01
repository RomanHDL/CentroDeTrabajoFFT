// Migracion real (Postgres) -- 2026-09-01, segunda ronda, a peticion
// explicita del usuario: en WC LINEA 0 (PROYECTO) quitar "Etiquetado 2" y
// agregar "Limpieza de caja" -- mismo patron ya aplicado a LINEA1..10 (ver
// migrate-limpieza-de-caja-2026-09-01.mjs), extendido ahora a PROYECTO
// (antes excluido por tener 10 posiciones en vez de 8). idealHeadcount
// sigue en 10, sin cambio -- "Montaje 2" NO se toca.
//
// IDEMPOTENTE: si ya se corrio antes, no hace nada (revisa `active` antes
// de tocar).
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/migrate-limpieza-de-caja-proyecto-2026-09-01.mjs
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

console.log('--- WC LINEA 0 (PROYECTO): Etiquetado 2 ---')
await deactivate('PROYECTO', 'Etiquetado 2')

console.log(
  '\nListo. Siguiente paso: npm run seed-personnel (crea/actualiza "Limpieza de caja" en PROYECTO).',
)
await db.$client.end()
