import { eq } from 'drizzle-orm'
import { db, user } from '../../../../server-lib/db/client.js'
import { requireModuleAccess } from '../../../../server-lib/auth.js'
import { listPermissionProtectedModules } from '../../../../shared/moduleRegistry.js'
import { resolveEffectiveAccess } from '../../../../shared/permissions.js'
import {
  getRoleModulePermissionsMap,
  getUserOverrides,
} from '../../../../server-lib/permissionService.js'

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id ?? req.params?.id
  // `foundUser` (no `user`) para no chocar con la tabla `user` importada de db/client.ts.
  const [foundUser] = await db.select().from(user).where(eq(user.id, id)).limit(1)
  if (!foundUser) return res.status(404).json({ error: 'Usuario no encontrado' })

  const [roleMap, overrides] = await Promise.all([
    getRoleModulePermissionsMap(),
    getUserOverrides(id),
  ])

  const modules = listPermissionProtectedModules().map((m) => {
    const roleAllowed = !!roleMap[foundUser.role]?.[m.key]
    const override = overrides[m.key] ?? null
    const effective = resolveEffectiveAccess({
      role: foundUser.role,
      module: m,
      roleAllowed,
      override,
    })
    return {
      moduleKey: m.key,
      name: m.name,
      icon: m.icon,
      systemReserved: m.systemReserved,
      roleAllowed,
      override,
      effective,
    }
  })

  return res.status(200).json({
    role: foundUser.role,
    active: foundUser.active,
    name: foundUser.name,
    employeeNumber: foundUser.employeeNumber,
    modules,
  })
})
