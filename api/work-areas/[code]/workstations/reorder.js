import { requireRole } from '../../../../server-lib/auth.js'
import {
  resolveWorkArea,
  reorderWorkstations,
  serializeWorkstation,
} from '../../../../server-lib/workstationConfig.ts'

// Reordena en bloque (drag/flechas en el drawer de configuracion) -- solo ADMINISTRADOR.
export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const code = req.query.code ?? req.params?.code
  const workArea = await resolveWorkArea(code)
  if (!workArea) return res.status(404).json({ error: 'Area de trabajo no encontrada' })

  const { orderedIds } = req.body || {}
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    return res.status(400).json({ error: 'orderedIds requerido' })
  }

  try {
    const rows = await reorderWorkstations(workArea.id, orderedIds)
    return res.status(200).json({ workstations: rows.map(serializeWorkstation) })
  } catch (e) {
    if (e.code === 'INVALID_IDS') return res.status(400).json({ error: e.message })
    throw e
  }
})
