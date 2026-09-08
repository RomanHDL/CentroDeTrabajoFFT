// One-shot: agrega al servidor "Supervisor" de Sorting (WorkArea + Workstation), a peticion
// explicita del usuario -- "donde dice entrada es un lugar donde va el supervisor y tiene ahi
// una compu" -- reemplaza el marcador decorativo "Entrada" por un area real, mismo patron que
// las demas areas simples de Sorting (1 Workstation capacity:999, igual que WC Supervisor real
// de FFT). Idempotente: si el area ya existe (por `code`), se omite.
import { desc, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'

const CODE = 'SORT_SUPERVISOR'
const NAME = 'Supervisor'

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
  const [createdWorkstation] = await db
    .insert(workstation)
    .values({
      workAreaId: createdWorkArea.id,
      name: NAME,
      capacity: 999,
      displayOrder: 1,
      active: true,
    })
    .returning()
  console.log(`${CODE}: creado WorkArea ${createdWorkArea.id} + Workstation ${createdWorkstation.id}`)
  await db.$client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
