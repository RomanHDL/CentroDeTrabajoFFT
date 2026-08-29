// Equivalente real de approveMove (repository.js): aplica el movimiento de verdad (mismo camino
// que /move) y marca la solicitud APPROVED. Si placeEmployee falla (la estacion se lleno
// mientras esperaba aprobacion, el empleado ya no tiene asignacion activa, o quedo BAJA), la
// solicitud se queda PENDING para que el supervisor decida de nuevo -- nunca se marca resuelta
// en un fallo.
//
// Concurrencia: "claim" atomico primero (updateMany con where status:'PENDING'), y SOLO si eso
// afecto exactamente 1 fila se ejecuta placeEmployee. Si dos aprobadores pulsan casi al mismo
// tiempo, el updateMany de Postgres serializa la actualizacion de esa fila -- solo uno de los dos
// puede ganar la condicion `status:'PENDING'` (el otro ve count:0 y recibe 409). Si placeEmployee
// falla despues de ganar el claim, se revierte el claim (vuelve a PENDING) para no perder la
// solicitud.
import { prisma } from '../../server-lib/prisma.js'
import { requireRole } from '../../server-lib/auth.js'
import { placeEmployee } from '../../server-lib/personnel.js'

export default requireRole(['SUPERVISOR', 'ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pendingMoveId } = req.body || {}
  if (!pendingMoveId) return res.status(400).json({ error: 'Falta pendingMoveId.' })

  const claimed = await prisma.pendingMove.updateMany({
    where: { id: pendingMoveId, status: 'PENDING' },
    data: { status: 'APPROVED', resolvedByUserId: req.user.id, resolvedAt: new Date() },
  })
  if (claimed.count === 0) {
    return res.status(409).json({ error: 'Esta solicitud ya fue atendida.' })
  }

  const pending = await prisma.pendingMove.findUnique({ where: { id: pendingMoveId } })

  const result = await placeEmployee({
    employeeId: pending.employeeId,
    workstationId: pending.toWorkstationId,
    shift: pending.shift,
    actingUserId: req.user.id,
    mode: 'MOVE',
  })

  if (result.status !== 'OK') {
    // Revertir el claim: la solicitud sigue pendiente para que se decida de nuevo.
    await prisma.pendingMove.update({
      where: { id: pendingMoveId },
      data: { status: 'PENDING', resolvedByUserId: null, resolvedAt: null },
    })
    if (result.status === 'INACTIVE_EMPLOYEE') {
      return res
        .status(409)
        .json({ error: 'El empleado quedó marcado como baja; la solicitud sigue pendiente.' })
    }
    if (result.status === 'NO_CURRENT_ASSIGNMENT') {
      return res
        .status(409)
        .json({
          error: 'El empleado ya no tiene una asignación activa hoy; la solicitud sigue pendiente.',
        })
    }
    if (result.status === 'STATION_FULL') {
      return res
        .status(409)
        .json({
          error: `La estación destino ya está completa (${result.occupiedCount}/${result.capacity}); la solicitud sigue pendiente.`,
        })
    }
    return res
      .status(409)
      .json({ error: 'No se pudo aplicar el movimiento; la solicitud sigue pendiente.' })
  }

  const updated = await prisma.pendingMove.findUnique({ where: { id: pendingMoveId } })
  return res.status(200).json({ pendingMove: updated, assignment: result.assignment })
})
