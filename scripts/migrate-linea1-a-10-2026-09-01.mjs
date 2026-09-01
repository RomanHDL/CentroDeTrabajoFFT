// Migracion real (Postgres) -- 2026-09-01, a peticion explicita del
// usuario: WC LINEA 1 sube de 8 a 10 puestos, misma estructura exacta que
// PROYECTO/WC LINEA 0. Las filas "Montaje 2" y "Empaque 2" YA EXISTIAN en
// la base (inactivas, de antes de la quinta ronda del 2026-08-28 que bajo
// LINEA1 de 9 a 8) -- solo se activan, no se crean de nuevo.
// idealHeadcount ya subio a 10 en catalog.js.
//
// IDEMPOTENTE: si ya estan activas, no hace nada.
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/migrate-linea1-a-10-2026-09-01.mjs
import { and, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'

async function activate(areaCode, name) {
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
  if (w.active) {
    console.log(`  OK (ya activo) ${areaCode}: "${name}"`)
    return
  }
  await db.update(workstation).set({ active: true }).where(eq(workstation.id, w.id))
  console.log(`  ACTIVADO ${areaCode}: "${name}"`)
}

console.log('--- WC LINEA 1: Montaje 2, Empaque 2 ---')
await activate('LINEA1', 'Montaje 2')
await activate('LINEA1', 'Empaque 2')

console.log('\nListo. Siguiente paso: npm run seed-personnel (sincroniza role/category del resto).')
await db.$client.end()
