// One-shot: agrega al servidor las 2 areas de Sorting que faltaban en el layout (WorkArea +
// Workstation), a peticion explicita del usuario tras ver el layout en vivo -- "en mi layout te
// faltaron dos dibujos cuadros... en medio donde esta kits y pnp va uno que se llama patines y
// alado de patines... va un cuadro chico que se llama gerente de sorting". Mismo patron EXACTO
// que seed-sorting-work-areas-2026-09-08.mjs (SIMPLE_AREAS: 1 sola Workstation capacity:999,
// igual que el WC GERENTE de FFT real -- ver comentario de src/data/production/catalogSorting.js,
// SORT_GERENTE). Idempotente: si una area ya existe (por `code`), se omite.
import { desc, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'

const SIMPLE_AREAS = [
  { code: 'SORT_PATINES', name: 'Patines' },
  { code: 'SORT_GERENTE', name: 'Gerente de Sorting' },
]

async function nextWorkAreaOrder() {
  const [maxOrder] = await db
    .select({ displayOrder: workArea.displayOrder })
    .from(workArea)
    .orderBy(desc(workArea.displayOrder))
    .limit(1)
  return (maxOrder?.displayOrder ?? 0) + 1
}

async function main() {
  let order = await nextWorkAreaOrder()

  for (const a of SIMPLE_AREAS) {
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
