// Backfill UNA VEZ de RoleModuleAccess (tabla vieja, un array por rol) hacia
// RoleModulePermission (tabla nueva, una fila por rol+modulo) -- migra los
// valores REALES que ya estaban en la DB, sin inventar defaults nuevos. No
// borra RoleModuleAccess ni inserta filas allowed:false (ausencia de fila ya
// significa false por convencion, ver server-lib/permissionService.js).
import { db, roleModuleAccess, roleModulePermission } from '../server-lib/db/client.js'

const rows = await db.select().from(roleModuleAccess)

let inserted = 0
for (const row of rows) {
  for (const moduleKey of row.modules) {
    await db
      .insert(roleModulePermission)
      .values({ role: row.role, moduleKey, allowed: true, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [roleModulePermission.role, roleModulePermission.moduleKey],
        set: { allowed: true, updatedAt: new Date() },
      })
    inserted += 1
    console.log(`OK ${row.role} -> ${moduleKey}`)
  }
}

console.log(
  `\nBackfill completo: ${inserted} filas de RoleModulePermission creadas/actualizadas desde ${rows.length} filas de RoleModuleAccess.`,
)

await db.$client.end()
