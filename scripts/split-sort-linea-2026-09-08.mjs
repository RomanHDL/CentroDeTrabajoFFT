// One-shot: reemplaza la unica area "SORT_LINEA" (7 Workstation adentro) por 7 areas reales
// independientes SORT_LINEA1..7 (1 Workstation capacity:4 cada una), a peticion explicita del
// usuario -- "ahi te falta poner que las lineas sean por separado, son 7 lineas independientes,
// no solo una". Antes de borrar nada verifica que no haya ninguna DailyAssignment/
// EmployeeMovement real apuntando a SORT_LINEA (broken por diseño: Sorting arranca sin
// snapshot y hasta ahora nadie real ha sido asignado ahi) -- si encuentra alguna, aborta sin
// tocar nada para no perder datos reales. Idempotente: si SORT_LINEA ya no existe (ya migrado),
// solo verifica/crea las 7 nuevas si faltan.
import { desc, eq, inArray } from 'drizzle-orm'
import {
  db,
  dailyAssignment,
  employeeMovement,
  workArea,
  workstation,
} from '../server-lib/db/client.js'

async function main() {
  const [oldArea] = await db.select().from(workArea).where(eq(workArea.code, 'SORT_LINEA')).limit(1)

  if (oldArea) {
    const oldStations = await db
      .select()
      .from(workstation)
      .where(eq(workstation.workAreaId, oldArea.id))
    const stationIds = oldStations.map((s) => s.id)

    const realAssignments = stationIds.length
      ? await db
          .select()
          .from(dailyAssignment)
          .where(inArray(dailyAssignment.workstationId, stationIds))
      : []
    const realMovements = stationIds.length
      ? await db
          .select()
          .from(employeeMovement)
          .where(inArray(employeeMovement.toWorkstationId, stationIds))
      : []

    if (realAssignments.length > 0 || realMovements.length > 0) {
      console.error(
        `ABORTADO: SORT_LINEA tiene ${realAssignments.length} asignacion(es) y ${realMovements.length} movimiento(s) reales -- no se puede dividir sin perder datos. Revisar a mano.`,
      )
      await db.$client.end()
      process.exit(1)
    }

    await db.delete(workstation).where(eq(workstation.workAreaId, oldArea.id))
    await db.delete(workArea).where(eq(workArea.id, oldArea.id))
    console.log(`SORT_LINEA: eliminada (WorkArea ${oldArea.id} + ${oldStations.length} Workstation), sin datos reales que perder.`)
  } else {
    console.log('SORT_LINEA: ya no existe (probablemente ya migrado antes).')
  }

  const [maxOrder] = await db
    .select({ displayOrder: workArea.displayOrder })
    .from(workArea)
    .orderBy(desc(workArea.displayOrder))
    .limit(1)
  let order = (maxOrder?.displayOrder ?? 0) + 1

  for (let i = 1; i <= 7; i++) {
    const code = `SORT_LINEA${i}`
    const name = `Línea de Sorting ${i}`
    const [existing] = await db.select().from(workArea).where(eq(workArea.code, code)).limit(1)
    if (existing) {
      console.log(`${code}: ya existe, se omite`)
      continue
    }
    const [createdWorkArea] = await db
      .insert(workArea)
      .values({ code, name, displayOrder: order++, active: true })
      .returning()
    const [createdWorkstation] = await db
      .insert(workstation)
      .values({
        workAreaId: createdWorkArea.id,
        name,
        capacity: 4,
        displayOrder: 1,
        active: true,
      })
      .returning()
    console.log(`${code}: creado WorkArea ${createdWorkArea.id} + Workstation ${createdWorkstation.id}`)
  }

  await db.$client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
