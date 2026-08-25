// Equivalente real de rejectMove (repository.js): retira la solicitud sin mover a nadie.
// `reason` se acepta y se devuelve en la respuesta pero no se persiste -- igual que el frontend
// (rejectMove tampoco lo guarda en cp_pending_moves_v1, solo lo regresa en el resultado).
//
// "Claim" atomico (updateMany con where status:'PENDING') igual que approve-move.js -- si dos
// usuarios resuelven la misma solicitud casi al mismo tiempo, solo uno gana; el otro recibe 409
// "ya fue atendida" en vez de un rechazo fantasma sobre una solicitud que otro ya aprobo.
import { prisma } from '../../server-lib/prisma.js'
import { requireRole } from '../../server-lib/auth.js'

export default requireRole(['SUPERVISOR', 'ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pendingMoveId, reason } = req.body || {}
  if (!pendingMoveId) return res.status(400).json({ error: 'Falta pendingMoveId.' })

  const claimed = await prisma.pendingMove.updateMany({
    where: { id: pendingMoveId, status: 'PENDING' },
    data: { status: 'REJECTED', resolvedByUserId: req.user.id, resolvedAt: new Date() },
  })
  if (claimed.count === 0) {
    return res.status(409).json({ error: 'Esta solicitud ya fue atendida.' })
  }

  const updated = await prisma.pendingMove.findUnique({ where: { id: pendingMoveId } })
  return res.status(200).json({ pendingMove: updated, reason: reason || null })
})
