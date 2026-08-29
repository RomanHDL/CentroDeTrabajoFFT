// Equivalente real de requestMove (repository.js): crea la PendingMove, NO mueve a nadie
// todavia. Cualquier rol autenticado puede pedirlo (un LIDER nunca reubica directo -- ver
// approve-move.js/reject-move.js).
import { and, eq } from 'drizzle-orm'
import {
  db,
  employee as employeeTable,
  dailyAssignment,
  pendingMove as pendingMoveTable,
} from '../../server-lib/db/client.js'
import { requireAuth } from '../../server-lib/auth.js'
import { resolveWorkstation, todayDateOnly } from '../../server-lib/personnel.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId, workAreaId, stationName, shift } = req.body || {}
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId.' })
  if (!workAreaId) return res.status(400).json({ error: 'Selecciona el área/línea destino.' })
  if (!stationName) return res.status(400).json({ error: 'Selecciona el rol/estación destino.' })

  const [employee] = await db
    .select()
    .from(employeeTable)
    .where(eq(employeeTable.id, employeeId))
    .limit(1)
  if (!employee) return res.status(404).json({ error: 'Empleado no encontrado.' })

  const workstation = await resolveWorkstation(workAreaId, stationName)
  if (!workstation) return res.status(400).json({ error: 'Área/estación inválida.' })

  const today = todayDateOnly()
  const [current] = await db
    .select()
    .from(dailyAssignment)
    .where(
      and(
        eq(dailyAssignment.employeeId, employeeId),
        eq(dailyAssignment.date, today),
        eq(dailyAssignment.status, 'ACTIVE'),
      ),
    )
    .limit(1)

  const [pendingMove] = await db
    .insert(pendingMoveTable)
    .values({
      employeeId,
      date: today,
      fromWorkstationId: current ? current.workstationId : null,
      toWorkstationId: workstation.id,
      shift: shift || current?.shift || 'GENERAL',
      requestedByUserId: req.user.id,
      status: 'PENDING',
    })
    .returning()
  return res.status(201).json({ pendingMove })
})
