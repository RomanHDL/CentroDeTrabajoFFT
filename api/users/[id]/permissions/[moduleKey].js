import { prisma } from '../../../../server-lib/prisma.js'
import { requireModuleAccess } from '../../../../server-lib/auth.js'
import { getModule } from '../../../../shared/moduleRegistry.js'
import { resolveEffectiveAccess } from '../../../../shared/permissions.js'
import {
  setUserOverride,
  getRoleModulePermissionsMap,
} from '../../../../server-lib/permissionService.js'

// moduleKey viaja URL-encoded (ej. "/dashboard" -> "%2Fdashboard") porque
// contiene una barra -- un solo segmento de ruta dinamica, decodificado
// automaticamente por Express/Vercel antes de llegar a req.query/req.params.
export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id ?? req.params?.id
  const moduleKey = req.query.moduleKey ?? req.params?.moduleKey
  const module = getModule(moduleKey)
  if (!module) return res.status(400).json({ error: 'Modulo invalido' })

  const { effect } = req.body || {}
  if (!['ALLOW', 'DENY', 'INHERIT'].includes(effect)) {
    return res.status(400).json({ error: 'effect debe ser ALLOW, DENY o INHERIT' })
  }

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

  try {
    await setUserOverride(id, moduleKey, effect, req.user.id)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  const roleMap = await getRoleModulePermissionsMap()
  const roleAllowed = !!roleMap[user.role]?.[moduleKey]
  const override = effect === 'INHERIT' ? null : effect
  const effective = resolveEffectiveAccess({ role: user.role, module, roleAllowed, override })

  return res.status(200).json({
    moduleKey,
    name: module.name,
    systemReserved: module.systemReserved,
    roleAllowed,
    override,
    effective,
  })
})
