// One-shot: crea en el servidor (WorkArea + Workstation real, mismo patron que
// INSUMOS/SELLADO/ACCESORIOS -- una sola Workstation por area, capacity:999,
// nombre igual al area) las 3 areas reales agregadas a catalog.js el
// 2026-08-25 (BOX_PREP/PRODUCCION/CHOFER) para las 26 personas reales que
// antes no aparecian en ningun bloque visual. Sin esto, el catalogo de
// cliente las conoce pero el backend no -- cualquier intento real de mover a
// alguien HACIA esas areas fallaria en el sync con "Area/estacion invalida"
// (bug real encontrado durante la verificacion manual de este mismo cambio).
import { prisma } from '../server-lib/prisma.js'

const AREAS = [
  { code: 'BOX_PREP', name: 'CT Box Prep' },
  { code: 'PRODUCCION', name: 'CT Producción (línea sin especificar)' },
  { code: 'CHOFER', name: 'CT Chofer' },
]

async function main() {
  const maxOrder = await prisma.workArea.findFirst({
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  })
  let order = (maxOrder?.displayOrder ?? 0) + 1

  for (const a of AREAS) {
    const existing = await prisma.workArea.findUnique({ where: { code: a.code } })
    if (existing) {
      console.log(`${a.code}: ya existe, se omite`)
      continue
    }
    const workArea = await prisma.workArea.create({
      data: { code: a.code, name: a.name, displayOrder: order++, active: true },
    })
    const workstation = await prisma.workstation.create({
      data: { workAreaId: workArea.id, name: a.name, capacity: 999, displayOrder: 1, active: true },
    })
    console.log(`${a.code}: creado WorkArea ${workArea.id} + Workstation ${workstation.id}`)
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
