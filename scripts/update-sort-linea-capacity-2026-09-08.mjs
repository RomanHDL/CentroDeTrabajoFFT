// One-shot: corrige la capacidad real de las 7 estaciones de SORT_LINEA de 2 a 4 personas cada
// una. Al sembrar Sorting (seed-sorting-work-areas-2026-09-08.mjs) se interpreto "van dos <-> asi,
// dos apuntan < y dos >" como parejas de 2; el usuario aclaro despues viendo el pizarron con mas
// detalle -- cada "linea" es una V con 2 personas en un extremo y otras 2 en el otro, 4 en total
// por linea (28 en total, no 14). Ver src/data/production/catalogSorting.js (idealHeadcount
// actualizado a 28) y SortingFloorPlan.jsx (rediseño visual de la V). Idempotente: solo actualiza
// las estaciones que hoy tengan capacity=2 bajo SORT_LINEA, seguro de re-ejecutar.
import { and, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'

async function main() {
  const [linea] = await db.select().from(workArea).where(eq(workArea.code, 'SORT_LINEA')).limit(1)
  if (!linea) {
    console.log('SORT_LINEA: no existe, nada que actualizar')
    await db.$client.end()
    return
  }
  const updated = await db
    .update(workstation)
    .set({ capacity: 4 })
    .where(and(eq(workstation.workAreaId, linea.id), eq(workstation.capacity, 2)))
    .returning()
  console.log(`SORT_LINEA: ${updated.length} estacion(es) actualizadas a capacity=4`)
  await db.$client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
