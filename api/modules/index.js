import { requireAuth } from '../../server-lib/auth.js'
import { listAllModules } from '../../shared/moduleRegistry.js'

// GET, cualquier usuario autenticado -- el frontend lo necesita para
// renderizar la UI de permisos (nombres/iconos/descripciones), no para
// administrar (eso sigue protegido en cada PATCH por requireRole).
export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  return res.status(200).json({ modules: listAllModules() })
})
