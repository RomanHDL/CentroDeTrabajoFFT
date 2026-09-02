// Equivalente real de swapOrBumpStation (repository.js/dndAssign.jsx confirmSwap) -- a
// diferencia de /move (que solo mueve a UN empleado y por eso, usado 2 veces por separado para
// un swap real, choca con el check de capacidad de placeEmployee -- ver el comentario grande en
// swapOrBumpStation, server-lib/personnel.js, para el detalle completo del bug real que esto
// corrige), este endpoint hace el intercambio COMPLETO en una sola transaccion server-side.
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../server-lib/auth.js'
import { db, employee as employeeTable } from '../../server-lib/db/client.js'
import { resolveWorkstation, swapOrBumpStation } from '../../server-lib/personnel.js'

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

  const result = await swapOrBumpStation({
    employeeIdA: employeeId,
    workstationId: workstation.id,
    shift,
    actingUserId: req.user.id,
  })

  if (result.status === 'INACTIVE_EMPLOYEE') {
    return res
      .status(400)
      .json({ error: 'Este empleado está marcado como baja y no puede moverse.' })
  }
  if (result.status === 'STATION_NOT_OCCUPIED') {
    return res.status(400).json({ error: `${stationName} no está ocupada -- usa /move.` })
  }
  if (result.status === 'ALREADY_AT_STATION') {
    return res.status(400).json({ error: 'Ese empleado ya está en esa estación.' })
  }
  return res.status(200).json({
    assignment: result.assignment,
    assignmentA: result.assignmentA,
    assignmentB: result.assignmentB,
    bumpedEmployeeId: result.bumpedEmployeeId || null,
    swappedEmployeeIds: result.swappedEmployeeIds || null,
  })
})
