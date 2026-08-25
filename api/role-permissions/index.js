import { requireAuth } from '../../server-lib/auth.js'
import { getRoleModulePermissionsMap } from '../../server-lib/permissionService.js'

// GET, cualquier usuario autenticado (no solo ADMINISTRADOR): el frontend lo
// necesita para decidir el menu/rutas de SU PROPIO rol, no para administrar.
// Mismo shape que antes ({ rolePermissions: { [role]: string[] de modulos
// permitidos } }), ahora derivado de RoleModulePermission en vez de la tabla
// vieja RoleModuleAccess (que se deja intacta, sin usar, como respaldo).
export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const map = await getRoleModulePermissionsMap()
  const rolePermissions = {}
  for (const [role, modules] of Object.entries(map)) {
    rolePermissions[role] = Object.entries(modules).filter(([, allowed]) => allowed).map(([key]) => key)
  }
  return res.status(200).json({ rolePermissions })
})
