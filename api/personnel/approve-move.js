// Equivalente real de approveMove (repository.js): aplica el movimiento de verdad (mismo camino
// que /move) y marca la solicitud APPROVED. Si placeEmployee falla (la estacion se lleno
// mientras esperaba aprobacion, o el empleado ya no tiene asignacion activa), la solicitud se
// queda PENDING para que el supervisor decida de nuevo -- nunca se marca resuelta en un fallo.
import { prisma } from '../../server-lib/prisma.js'
import { requireRole } from '../../server-lib/auth.js'
import { placeEmployee } from '../../server-lib/personnel.js'

export default requireRole(['SUPERVISOR', 'ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pendingMoveId } = req.body || {}
  if (!pendingMoveId) return res.status(400).json({ error: 'Falta pendingMoveId.' })

  const pending = await prisma.pendingMove.findUnique({ where: { id: pendingMoveId } })
  if (!pending || pending.status !== 'PENDING') {
    return res.status(404).json({ error: 'Esa solicitud ya no existe o ya fue resuelta.' })
  }

  const result = await placeEmployee({
    employeeId: pending.employeeId,
    workstationId: pending.toWorkstationId,
    shift: pending.shift,
    actingUserId: req.user.id,
    mode: 'MOVE',
  })

  if (result.status === 'NO_CURRENT_ASSIGNMENT') {
    return res.status(409).json({ error: 'El empleado ya no tiene una asignación activa hoy; la solicitud sigue pendiente.' })
  }
  if (result.status === 'STATION_FULL') {
    return res.status(409).json({ error: `La estación destino ya está completa (${result.occupiedCount}/${result.capacity}); la solicitud sigue pendiente.` })
  }

  const updated = await prisma.pendingMove.update({
    where: { id: pendingMoveId },
    data: { status: 'APPROVED', resolvedByUserId: req.user.id, resolvedAt: new Date() },
  })
  return res.status(200).json({ pendingMove: updated, assignment: result.assignment })
})
