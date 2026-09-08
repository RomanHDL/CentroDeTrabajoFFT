// One-shot: agrega al servidor el "Conveyor de Sorting" (WorkArea + 2 Workstation reales), a
// peticion explicita del usuario tras ver el layout en vivo -- "no veo el conveyor aqui... debe
// ser el conveyor del mismo grosor que el de FFT". Confirmado explicitamente via pregunta
// directa: debe ser un area real con su propia gente asignable, igual criterio que "WC Conveyor
// General" (CONVEYOR_PRINCIPAL) en catalog.js (FFT) -- 2 posiciones reales, capacity 1 cada una
// (a diferencia de las demas areas simples de Sorting, que son un solo bucket capacity:999).
// Idempotente: si el area ya existe (por `code`), se omite.
import { desc, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'

const CODE = 'SORT_CONVEYOR'
const NAME = 'Conveyor de Sorting'

async function nextWorkAreaOrder() {
  const [maxOrder] = await db
    .select({ displayOrder: workArea.displayOrder })
    .from(workArea)
    .orderBy(desc(workArea.displayOrder))
    .limit(1)
  return (maxOrder?.displayOrder ?? 0) + 1
}

async function main() {
  const [existing] = await db.select().from(workArea).where(eq(workArea.code, CODE)).limit(1)
  if (existing) {
    console.log(`${CODE}: ya existe, se omite`)
    await db.$client.end()
    return
  }
  const order = await nextWorkAreaOrder()
  const [createdWorkArea] = await db
    .insert(workArea)
    .values({ code: CODE, name: NAME, displayOrder: order, active: true })
    .returning()

  for (let i = 1; i <= 2; i++) {
    const [createdWorkstation] = await db
      .insert(workstation)
      .values({
        workAreaId: createdWorkArea.id,
        name: `Puesto ${i}`,
        capacity: 1,
        displayOrder: i,
        active: true,
      })
      .returning()
    console.log(`${CODE}: creada Workstation ${createdWorkstation.id} (Puesto ${i})`)
  }

  console.log(`${CODE}: creado WorkArea ${createdWorkArea.id} + 2 Workstation`)
  await db.$client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
