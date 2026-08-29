import { requireModuleAccess, publicUser } from '../../../../server-lib/auth.js'
import { getModule } from '../../../../shared/moduleRegistry.js'
import { getUsersWithEffectiveAccess } from '../../../../server-lib/permissionService.ts'

// GET -- TODOS los usuarios ACTIVOS con acceso EFECTIVO a este modulo (no
// solo por rol: incluye overrides ALLOW individuales, excluye a quien tenga
// DENY aunque su rol lo permita). Usado por el boton "Ver N usuarios" de la
// columna Acciones en la matriz Por Rol (una fila = un modulo, sin distinguir
// por columna de rol).
export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const moduleKey = req.query.moduleKey ?? req.params?.moduleKey
  if (!getModule(moduleKey)) return res.status(400).json({ error: 'Modulo invalido' })

  const users = await getUsersWithEffectiveAccess(moduleKey)
  return res.status(200).json({ users: users.map(publicUser) })
})
