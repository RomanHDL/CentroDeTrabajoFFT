// Equivalente real de rejectMove (repository.js): retira la solicitud sin mover a nadie.
// `reason` se acepta y se devuelve en la respuesta pero no se persiste -- igual que el frontend
// (rejectMove tampoco lo guarda en cp_pending_moves_v1, solo lo regresa en el resultado).
import { prisma } from '../../server-lib/prisma.js'
import { requireRole } from '../../server-lib/auth.js'

export default requireRole(['SUPERVISOR', 'ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pendingMoveId, reason } = req.body || {}
  if (!pendingMoveId) return res.status(400).json({ error: 'Falta pendingMoveId.' })

  const pending = await prisma.pendingMove.findUnique({ where: { id: pendingMoveId } })
  if (!pending || pending.status !== 'PENDING') {
    return res.status(404).json({ error: 'Esa solicitud ya no existe o ya fue resuelta.' })
  }

  const updated = await prisma.pendingMove.update({
    where: { id: pendingMoveId },
    data: { status: 'REJECTED', resolvedByUserId: req.user.id, resolvedAt: new Date() },
  })
  return res.status(200).json({ pendingMove: updated, reason: reason || null })
})
