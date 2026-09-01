// Migracion real (Postgres) -- 2026-09-01, a peticion explicita del usuario:
// alta de "Limpieza de caja" como puesto real (posicion 7 de 8) en WC LINEA 1..10,
// reemplazando el UNICO puesto repetido que existia en cada una de esas 10 lineas
// (ver workstations.js/LIMPIEZA_CAJA_COUNT_BY_LINE para el detalle completo).
//
// Esta migracion desactiva (soft-delete, NUNCA DELETE fisico) esas estaciones ya
// obsoletas -- mismo patron ya probado en
// migrate-limpieza-tv2-montaje3-2026-08-28.mjs:
//   - LINEA1: "Suministro de Accesorios 2"
//   - LINEA2..10: "Etiquetado 2"
// Si alguien real la ocupaba, su asignacion NUNCA se toca aqui -- sigue exactamente
// igual en la base de datos, solo deja de encontrar una estacion activa que la
// reclame (aparece en "Personal sin estación" hasta que un admin la reasigne).
//
// IDEMPOTENTE: si ya se corrio antes, no hace nada (revisa `active` antes de tocar).
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/migrate-limpieza-de-caja-2026-09-01.mjs
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

console.log('--- WC LINEA 1: Suministro de Accesorios 2 ---')
await deactivate('LINEA1', 'Suministro de Accesorios 2')

console.log('\n--- WC LINEA 2..10: Etiquetado 2 ---')
for (const areaCode of [
  'LINEA2',
  'LINEA3',
  'LINEA4',
  'LINEA5',
  'LINEA6',
  'LINEA7',
  'LINEA8',
  'LINEA9',
  'LINEA10',
]) {
  await deactivate(areaCode, 'Etiquetado 2')
}

console.log(
  '\n(WC LINEA 0/PROYECTO: sin cambio a proposito -- tiene 10 posiciones, no 8, queda fuera de este cambio.)',
)

console.log(
  '\nListo. Siguiente paso: npm run seed-personnel (crea/actualiza "Limpieza de caja" en las 10 lineas).',
)
await db.$client.end()
