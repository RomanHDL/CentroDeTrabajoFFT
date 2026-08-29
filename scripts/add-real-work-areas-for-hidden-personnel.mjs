// One-shot: crea en el servidor (WorkArea + Workstation real, mismo patron que
// INSUMOS/SELLADO/ACCESORIOS -- una sola Workstation por area, capacity:999,
// nombre igual al area) las 3 areas reales agregadas a catalog.js el
// 2026-08-25 (BOX_PREP/PRODUCCION/CHOFER) para las 26 personas reales que
// antes no aparecian en ningun bloque visual. Sin esto, el catalogo de
// cliente las conoce pero el backend no -- cualquier intento real de mover a
// alguien HACIA esas areas fallaria en el sync con "Area/estacion invalida"
// (bug real encontrado durante la verificacion manual de este mismo cambio).
import { desc, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'

const AREAS = [
  { code: 'BOX_PREP', name: 'CT Box Prep' },
  { code: 'PRODUCCION', name: 'CT Producción (línea sin especificar)' },
  { code: 'CHOFER', name: 'CT Chofer' },
]

async function main() {
  const [maxOrder] = await db
    .select({ displayOrder: workArea.displayOrder })
    .from(workArea)
    .orderBy(desc(workArea.displayOrder))
    .limit(1)
  let order = (maxOrder?.displayOrder ?? 0) + 1

  for (const a of AREAS) {
    const [existing] = await db.select().from(workArea).where(eq(workArea.code, a.code)).limit(1)
    if (existing) {
      console.log(`${a.code}: ya existe, se omite`)
      continue
    }
    const [createdWorkArea] = await db
      .insert(workArea)
      .values({ code: a.code, name: a.name, displayOrder: order++, active: true })
      .returning()
    const [createdWorkstation] = await db
      .insert(workstation)
      .values({
        workAreaId: createdWorkArea.id,
        name: a.name,
        capacity: 999,
        displayOrder: 1,
        active: true,
      })
      .returning()
    console.log(
      `${a.code}: creado WorkArea ${createdWorkArea.id} + Workstation ${createdWorkstation.id}`,
    )
  }
  await db.$client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
