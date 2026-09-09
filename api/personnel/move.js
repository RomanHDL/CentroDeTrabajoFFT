// Equivalente real de moveEmployee (repository.js). Requiere que el empleado YA tenga una
// asignacion ACTIVE hoy (para eso esta /checkin) -- termina esa fila (endReason MOVED) y crea
// una nueva, nunca sobreescribe/borra la anterior.
import { eq } from 'drizzle-orm'
import { db, employee as employeeTable } from '../../server-lib/db/client.js'
import { requireRole } from '../../server-lib/auth.js'
import { resolveWorkstation, placeEmployee } from '../../server-lib/personnel.js'

// 2026-09-09 (a peticion explicita del usuario -- "no quiero que se muevan
// solos, solo yo u otro administrador o supervisor pueden moverlo"):
// antes esto solo exigia requireAuth (cualquier rol autenticado, incluido
// LIDER, podia moverse directo pegandole a este endpoint) -- el cliente
// (MoveConfirmDialog.jsx) ya redirigia a un LIDER por /request-move en vez
// de aqui, pero eso era solo UI: nada del lado servidor lo impedia de
// verdad. Mismo guard que ya usaban approve-move.js/reject-move.js.
export default requireRole(['SUPERVISOR', 'ADMINISTRADOR'], async (req, res) => {
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
