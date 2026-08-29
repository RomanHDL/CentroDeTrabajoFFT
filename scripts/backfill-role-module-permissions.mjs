// Backfill UNA VEZ de RoleModuleAccess (tabla vieja, un array por rol) hacia
// RoleModulePermission (tabla nueva, una fila por rol+modulo) -- migra los
// valores REALES que ya estaban en la DB, sin inventar defaults nuevos. No
// borra RoleModuleAccess ni inserta filas allowed:false (ausencia de fila ya
// significa false por convencion, ver server-lib/permissionService.js).
import { prisma } from '../server-lib/prisma.js'

const rows = await prisma.roleModuleAccess.findMany()

let inserted = 0
for (const row of rows) {
  for (const moduleKey of row.modules) {
    await prisma.roleModulePermission.upsert({
      where: { role_moduleKey: { role: row.role, moduleKey } },
      create: { role: row.role, moduleKey, allowed: true },
      update: { allowed: true },
    })
    inserted += 1
    console.log(`OK ${row.role} -> ${moduleKey}`)
  }
}

console.log(
  `\nBackfill completo: ${inserted} filas de RoleModulePermission creadas/actualizadas desde ${rows.length} filas de RoleModuleAccess.`,
)

await prisma.$disconnect()
