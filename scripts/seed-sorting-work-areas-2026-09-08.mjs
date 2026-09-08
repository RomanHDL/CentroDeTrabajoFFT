// One-shot: crea en el servidor las 7 areas reales de Sorting (WorkArea + Workstation), mismo
// patron ya usado en scripts/add-real-work-areas-for-hidden-personnel.mjs para agregar areas
// nuevas al catalogo -- sin esto, el catalogo de cliente (src/data/production/catalogSorting.js)
// conoce estas areas pero el backend no, y cualquier intento real de mover/registrar a alguien
// hacia ellas fallaria con "Area/estacion invalida". Idempotente: si una area ya existe (por
// `code`), se omite.
//
// 6 areas simples (RCY/FRM/KITS/PNP/DMR_DML/DMA_DMT): 1 sola Workstation capacity:999 cada una,
// igual que INSUMOS/ACCESORIOS -- bucket simple, sin puestos numerados fijos.
// SORT_LINEA (la linea de 7 puestos dobles del pizarron, "van dos <-> asi, dos apuntan < y dos
// >"): 7 Workstation capacity:2 cada una (parejas de gente trabajando enfrentada), via
// createWorkstations (mismo helper que ya usa la API real de "Configurar puestos") en vez de
// reimplementar el insert a mano.
import { desc, eq } from 'drizzle-orm'
import { db, workArea, workstation } from '../server-lib/db/client.js'
import { createWorkstations, nextDisplayOrder } from '../server-lib/workstationConfig.js'

const SIMPLE_AREAS = [
  { code: 'SORT_RCY', name: 'RCY' },
  { code: 'SORT_FRM', name: 'FRM' },
  { code: 'SORT_KITS', name: 'KITS' },
  { code: 'SORT_PNP', name: 'PNP' },
  { code: 'SORT_DMR_DML', name: 'DMR / DML' },
  { code: 'SORT_DMA_DMT', name: 'DMA / DMT' },
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

  const [existingLinea] = await db
    .select()
    .from(workArea)
    .where(eq(workArea.code, 'SORT_LINEA'))
    .limit(1)
  if (existingLinea) {
    console.log('SORT_LINEA: ya existe, se omite')
  } else {
    const [createdLinea] = await db
      .insert(workArea)
      .values({ code: 'SORT_LINEA', name: 'Línea de Sorting', displayOrder: order++, active: true })
      .returning()
    const displayOrderStart = await nextDisplayOrder(createdLinea.id)
    const stations = await createWorkstations({
      workAreaId: createdLinea.id,
      baseName: 'Puesto',
      requiredRoleLabel: null,
      category: null,
      capacity: 2,
      quantity: 7,
      displayOrderStart,
    })
    console.log(`SORT_LINEA: creado WorkArea ${createdLinea.id} + ${stations.length} Workstation`)
  }

  await db.$client.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
