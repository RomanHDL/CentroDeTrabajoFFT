import { prisma } from '../../../../server-lib/prisma.js'
import { requireRole } from '../../../../server-lib/auth.js'
import { listPermissionProtectedModules } from '../../../../shared/moduleRegistry.js'
import { resolveEffectiveAccess } from '../../../../shared/permissions.js'
import { getRoleModulePermissionsMap, getUserOverrides } from '../../../../server-lib/permissionService.js'

export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id ?? req.params?.id
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

  const [roleMap, overrides] = await Promise.all([
    getRoleModulePermissionsMap(),
    getUserOverrides(id),
  ])

  const modules = listPermissionProtectedModules().map((m) => {
    const roleAllowed = !!roleMap[user.role]?.[m.key]
    const override = overrides[m.key] ?? null
    const effective = resolveEffectiveAccess({ role: user.role, module: m, roleAllowed, override })
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
    role: user.role,
    active: user.active,
    name: user.name,
    employeeNumber: user.employeeNumber,
    modules,
  })
})
