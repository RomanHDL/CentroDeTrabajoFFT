// Equivalente real de moveEmployee (repository.js). Requiere que el empleado YA tenga una
// asignacion ACTIVE hoy (para eso esta /checkin) -- termina esa fila (endReason MOVED) y crea
// una nueva, nunca sobreescribe/borra la anterior.
import { eq } from 'drizzle-orm'
import { db, employee as employeeTable } from '../../server-lib/db/client.ts'
import { requireAuth } from '../../server-lib/auth.js'
import { resolveWorkstation, placeEmployee } from '../../server-lib/personnel.ts'

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

  const result = await placeEmployee({
    employeeId,
    workstationId: workstation.id,
    shift,
    actingUserId: req.user.id,
    mode: 'MOVE',
  })

  if (result.status === 'INACTIVE_EMPLOYEE') {
    return res
      .status(400)
      .json({ error: 'Este empleado está marcado como baja y no puede moverse.' })
  }
  if (result.status === 'NO_CURRENT_ASSIGNMENT') {
    return res.status(400).json({ error: 'El empleado no tiene una asignación activa hoy.' })
  }
  if (result.status === 'STATION_FULL') {
    return res.status(409).json({
      error: `${stationName} ya está completa (${result.occupiedCount}/${result.capacity}).`,
    })
  }
  return res.status(200).json({ assignment: result.assignment })
})
