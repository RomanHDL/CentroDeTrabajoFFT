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
import { desc, eq, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  db,
  employeeMovement,
  employee,
  user,
  workstation,
  workArea,
} from '../../server-lib/db/client.js'
import { requireAuth } from '../../server-lib/auth.js'

// fromWorkstation/toWorkstation son ambas FKs a la MISMA tabla Workstation (y cada una necesita
// su propia WorkArea) -- de ahi los alias, equivalente real del doble `include` anidado de Prisma
// (fromWorkstation.workArea / toWorkstation.workArea).
const fromWorkstation = alias(workstation, 'fromWorkstation')
const fromWorkArea = alias(workArea, 'fromWorkArea')
const toWorkstation = alias(workstation, 'toWorkstation')
const toWorkArea = alias(workArea, 'toWorkArea')

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const areaCode = req.query.areaId
  if (!areaCode) return res.status(400).json({ error: 'Falta areaId.' })

  const limit = Math.min(Number(req.query.limit) || 10, 50)

  const movements = await db
    .select({
      id: employeeMovement.id,
      movedAt: employeeMovement.movedAt,
      fromWorkstationId: employeeMovement.fromWorkstationId,
      employeeFullName: employee.fullName,
      movedByName: user.name,
      fromAreaCode: fromWorkArea.code,
      toAreaCode: toWorkArea.code,
    })
    .from(employeeMovement)
    .innerJoin(employee, eq(employeeMovement.employeeId, employee.id))
    .leftJoin(user, eq(employeeMovement.movedByUserId, user.id))
    .leftJoin(fromWorkstation, eq(employeeMovement.fromWorkstationId, fromWorkstation.id))
    .leftJoin(fromWorkArea, eq(fromWorkstation.workAreaId, fromWorkArea.id))
    .innerJoin(toWorkstation, eq(employeeMovement.toWorkstationId, toWorkstation.id))
    .innerJoin(toWorkArea, eq(toWorkstation.workAreaId, toWorkArea.id))
    .where(or(eq(fromWorkArea.code, areaCode), eq(toWorkArea.code, areaCode)))
    .orderBy(desc(employeeMovement.movedAt))
    .limit(limit)

  return res.status(200).json({
    history: movements.map((m) => ({
      id: m.id,
      employeeName: m.employeeFullName,
      byName: m.movedByName || null,
      movedAt: m.movedAt.toISOString(),
      action: m.fromWorkstationId ? 'MOVED' : 'ASSIGNED',
      fromAreaCode: m.fromAreaCode || null,
      toAreaCode: m.toAreaCode,
    })),
  })
})
