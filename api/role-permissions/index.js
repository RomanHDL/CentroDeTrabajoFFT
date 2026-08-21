import { prisma } from '../../server-lib/prisma.js'
import { requireAuth } from '../../server-lib/auth.js'

// GET, cualquier usuario autenticado (no solo ADMINISTRADOR): el frontend lo
// necesita para decidir el menu/rutas de SU PROPIO rol, no para administrar.
export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const rows = await prisma.roleModuleAccess.findMany()
  const byRole = {}
  rows.forEach((r) => { byRole[r.role] = r.modules })
  return res.status(200).json({ rolePermissions: byRole })
})
