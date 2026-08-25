import { requireRole } from '../../server-lib/auth.js'
import { setRoleModulePermission, getRoleModulePermissionsMap } from '../../server-lib/permissionService.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

// PATCH { moduleKey, allowed } -- toggle atomico de UN permiso (ya no
// reemplaza el array completo como el contrato viejo). Las reglas
// "ADMINISTRADOR siempre completo" y "modulo reservado no se gestiona aqui"
// viven en permissionService.setRoleModulePermission, no duplicadas aqui.
export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const role = req.query.role ?? req.params?.role
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido' })

  const { moduleKey, allowed } = req.body || {}
  if (typeof moduleKey !== 'string' || typeof allowed !== 'boolean') {
    return res.status(400).json({ error: 'moduleKey (string) y allowed (boolean) son requeridos' })
  }

  try {
    await setRoleModulePermission(role, moduleKey, allowed, req.user.id)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  const map = await getRoleModulePermissionsMap()
  return res.status(200).json({ role, modules: map[role] })
})
