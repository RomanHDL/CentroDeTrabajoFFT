// Equivalente real de releaseAssignment (repository.js): termina la asignacion ACTIVE de hoy
// (endReason RELEASED), no crea una nueva. A diferencia de checkin/move, esto NO crea un
// EmployeeMovement -- ese modelo exige toWorkstationId NOT NULL (append-only de movimientos con
// destino real) y un release no tiene destino. El roster (/api/personnel/roster) sigue
// reflejando correctamente "tocado hoy, sin ubicacion" para este caso porque revisa
// DailyAssignment directamente (cualquier fila de hoy, ACTIVE o no), no EmployeeMovement.
import { prisma } from '../../server-lib/prisma.js'
import { requireAuth } from '../../server-lib/auth.js'
import { todayDateOnly } from '../../server-lib/personnel.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId } = req.body || {}
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId.' })

  const today = todayDateOnly()
  const current = await prisma.dailyAssignment.findFirst({
    where: { employeeId, date: today, status: 'ACTIVE' },
  })
  if (!current) return res.status(400).json({ error: 'El empleado no tiene una ubicación asignada hoy.' })

  const updated = await prisma.dailyAssignment.update({
    where: { id: current.id },
    data: { status: 'ENDED', endedAt: new Date(), endedByUserId: req.user.id, endReason: 'RELEASED' },
  })
  return res.status(200).json({ assignment: updated })
})
