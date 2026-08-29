// Equivalente real de releaseAssignment (repository.js): termina la asignacion ACTIVE vigente
// (endReason RELEASED), no crea una nueva. A diferencia de checkin/move, esto NO crea un
// EmployeeMovement -- ese modelo exige toWorkstationId NOT NULL (append-only de movimientos con
// destino real) y un release no tiene destino.
import { and, eq } from 'drizzle-orm'
import { db, dailyAssignment } from '../../server-lib/db/client.js'
import { requireAuth } from '../../server-lib/auth.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId } = req.body || {}
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId.' })

  // Sin date:today (2026-08-27, mismo bug real que personnel.js/placeEmployee): una asignacion
  // ACTIVE real sigue siendo la vigente sin importar que dia quedo registrada -- filtrar por hoy
  // hacia que "Quitar" fallara en silencio para cualquiera cuya ultima asignacion real no fuera
  // de "hoy" exacto.
  const [current] = await db
    .select()
    .from(dailyAssignment)
    .where(and(eq(dailyAssignment.employeeId, employeeId), eq(dailyAssignment.status, 'ACTIVE')))
    .limit(1)
  if (!current)
    return res.status(400).json({ error: 'El empleado no tiene una ubicación asignada hoy.' })

  const [updated] = await db
    .update(dailyAssignment)
    .set({
      status: 'ENDED',
      endedAt: new Date(),
      endedByUserId: req.user.id,
      endReason: 'RELEASED',
      updatedAt: new Date(),
    })
    .where(eq(dailyAssignment.id, current.id))
    .returning()
  return res.status(200).json({ assignment: updated })
})
