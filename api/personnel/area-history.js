// Historial reciente REAL de una area -- para OperationalAreaDetail.jsx
// (2026-08-25). Lee EmployeeMovement directamente (append-only, nunca se
// edita/borra) en vez del store local: el store local nunca conoce quien
// hizo el movimiento (checkInEmployee/moveEmployee en repository.js
// siempre guardan movedBy: null ahi), pero el servidor SI lo tiene
// (EmployeeMovement.movedByUserId es obligatorio) -- este endpoint es la
// unica forma real de mostrar "quien" hizo cada movimiento, sin inventar
// un autor. Sin `type` (RELEASE no crea EmployeeMovement server-side, ver
// nota en api/personnel/roster.js) -- fromWorkstationId null distingue
// "asignacion" de "reasignacion".
import { prisma } from '../../server-lib/prisma.js'
import { requireAuth } from '../../server-lib/auth.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const areaCode = req.query.areaId
  if (!areaCode) return res.status(400).json({ error: 'Falta areaId.' })

  const limit = Math.min(Number(req.query.limit) || 10, 50)

  const movements = await prisma.employeeMovement.findMany({
    where: {
      OR: [
        { fromWorkstation: { workArea: { code: areaCode } } },
        { toWorkstation: { workArea: { code: areaCode } } },
      ],
    },
    include: {
      employee: { select: { fullName: true } },
      movedBy: { select: { name: true } },
      fromWorkstation: { include: { workArea: true } },
      toWorkstation: { include: { workArea: true } },
    },
    orderBy: { movedAt: 'desc' },
    take: limit,
  })

  return res.status(200).json({
    history: movements.map((m) => ({
      id: m.id,
      employeeName: m.employee.fullName,
      byName: m.movedBy?.name || null,
      movedAt: m.movedAt.toISOString(),
      action: m.fromWorkstationId ? 'MOVED' : 'ASSIGNED',
      fromAreaCode: m.fromWorkstation?.workArea?.code || null,
      toAreaCode: m.toWorkstation.workArea.code,
    })),
  })
})
