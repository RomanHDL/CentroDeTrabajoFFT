// Migracion real (Postgres) -- 2026-08-28, cuarta ronda, a peticion explicita del usuario:
// "WC LINEA 1 Y WC LINEA 6 A LA 10 ELIMINA LIMPIEZA DE TV 2 ... EN WC LINEA 0 MONTAJE 3,
// LIMPIEZA DE TV 2 Y SUMINISTRO DE ACCESORIOS [2]".
//
// Investigacion en vivo (ver reporte de esta tarea) confirmo que LINEA1 NUNCA tuvo una fila
// "Limpieza de TV 2" en Postgres -- su unica posicion repetida (antes y despues de este cambio)
// es "Suministro de Accesorios 2", sin ocupante real (occ=0). Por el piso minimo de 6 posiciones
// por linea (ya confirmado en una tarea anterior), LINEA1 no puede bajar a 0 posiciones repetidas
// sin desincronizar "Dotación ideal" contra la cantidad real de estaciones -- se deja SIN CAMBIO,
// reportado explicitamente al usuario en el resumen final.
//
// Esta migracion desactiva (soft-delete, NUNCA DELETE fisico) las estaciones que SI quedaron
// obsoletas tras bajar idealHeadcount (catalog.js):
//   - PROYECTO: "Montaje 3" (occ=1, Joshua Oscar Estrada segun conteo de una tarea anterior),
//               "Limpieza de TV 2" (occ=1), "Suministro de Accesorios 2" (occ=0).
//   - LINEA6..10: "Limpieza de TV 2" (occ=0 en las 5).
// Si alguien real la ocupaba, su asignacion NUNCA se toca aqui -- sigue exactamente igual en la
// base de datos, solo deja de encontrar una estacion activa que la reclame (aparece en "Personal
// sin estación" o se reconcilia sola a la estacion libre nueva que el siguiente
// `npm run seed-personnel` crea en su lugar -- mismo mecanismo ya probado, nunca escrito por
// este script).
//
// IDEMPOTENTE: si ya se corrio antes, no hace nada (revisa `active` antes de tocar).
//
// Uso: node --env-file=.env.local --import ./scripts/_esm-extensionless-loader.mjs scripts/migrate-limpieza-tv2-montaje3-2026-08-28.mjs
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

console.log(
  '--- WC LINEA 0 (PROYECTO): Montaje 3, Limpieza de TV 2, Suministro de Accesorios 2 ---',
)
await deactivate('PROYECTO', 'Montaje 3')
await deactivate('PROYECTO', 'Limpieza de TV 2')
await deactivate('PROYECTO', 'Suministro de Accesorios 2')

console.log('\n--- WC LINEA 6..10: Limpieza de TV 2 ---')
for (const areaCode of ['LINEA6', 'LINEA7', 'LINEA8', 'LINEA9', 'LINEA10']) {
  await deactivate(areaCode, 'Limpieza de TV 2')
}

console.log(
  '\n(WC LINEA 1: sin cambio a proposito -- nunca tuvo "Limpieza de TV 2"; su unica posicion repetida, "Suministro de Accesorios 2", se queda por el piso minimo de 6 posiciones por linea. Ver comentario en catalog.js/workstations.js.)',
)

console.log(
  '\nListo. Siguiente paso: npm run seed-personnel (sincroniza role/category/active de TODAS las estaciones de WC LINEA con el generador actual).',
)
await db.$client.end()
