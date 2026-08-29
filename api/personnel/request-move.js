// Equivalente real de requestMove (repository.js): crea la PendingMove, NO mueve a nadie
// todavia. Cualquier rol autenticado puede pedirlo (un LIDER nunca reubica directo -- ver
// approve-move.js/reject-move.js).
import { prisma } from '../../server-lib/prisma.js'
import { requireAuth } from '../../server-lib/auth.js'
import { resolveWorkstation, todayDateOnly } from '../../server-lib/personnel.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId, workAreaId, stationName, shift } = req.body || {}
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId.' })
  if (!workAreaId) return res.status(400).json({ error: 'Selecciona el área/línea destino.' })
  if (!stationName) return res.status(400).json({ error: 'Selecciona el rol/estación destino.' })

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return res.status(404).json({ error: 'Empleado no encontrado.' })

  const workstation = await resolveWorkstation(workAreaId, stationName)
  if (!workstation) return res.status(400).json({ error: 'Área/estación inválida.' })

  const today = todayDateOnly()
  const current = await prisma.dailyAssignment.findFirst({
    where: { employeeId, date: today, status: 'ACTIVE' },
  })

  const pendingMove = await prisma.pendingMove.create({
    data: {
      employeeId,
      date: today,
      fromWorkstationId: current ? current.workstationId : null,
      toWorkstationId: workstation.id,
      shift: shift || current?.shift || 'GENERAL',
      requestedByUserId: req.user.id,
      status: 'PENDING',
    },
  })
  return res.status(201).json({ pendingMove })
})
