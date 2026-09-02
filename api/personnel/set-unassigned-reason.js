// Motivo real por el que alguien aparece en "Personal sin asignar" -- a peticion explicita del
// usuario ("ahi yo pueda poner si ya es baja o cambio de turno o si fue por falta... si le doy
// que es baja que lo lleve al apartado de bajas"). BAJA ademas desactiva de verdad al empleado
// (Employee.active=false, MISMO campo real que ya bloqueaba checkin/move/swap para BAJA -- ver
// placeEmployee/swapOrBumpStation, server-lib/personnel.js -- nunca un segundo concepto de
// "baja" paralelo). TURNO/FALTA son solo una etiqueta informativa: el empleado se queda activo
// y sigue apareciendo en "Personal sin asignar", ahora con el motivo visible.
//
// reason=null limpia el motivo -- si el empleado estaba en BAJA por este mecanismo, tambien lo
// reactiva (active=true). Nunca reactiva a alguien marcado BAJA por otra via (el snapshot
// historico realPersonnelSnapshot.js/scripts de correccion manual) -- ver comentario en
// repository.js/getAllEmployees sobre como se combinan ambas fuentes.
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../server-lib/auth.js'
import { db, employee as employeeTable } from '../../server-lib/db/client.js'

const VALID_REASONS = new Set(['BAJA', 'TURNO', 'FALTA'])

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId, reason } = req.body || {}
  if (!employeeId) return res.status(400).json({ error: 'Falta employeeId.' })
  if (reason !== null && reason !== undefined && !VALID_REASONS.has(reason)) {
    return res.status(400).json({ error: 'Motivo inválido.' })
  }

  const [emp] = await db
    .select()
    .from(employeeTable)
    .where(eq(employeeTable.id, employeeId))
    .limit(1)
  if (!emp) return res.status(404).json({ error: 'Empleado no encontrado.' })

  const normalizedReason = reason || null
  const [updated] = await db
    .update(employeeTable)
    .set({
      unassignedReason: normalizedReason,
      unassignedReasonSetAt: normalizedReason ? new Date() : null,
      unassignedReasonSetByUserId: normalizedReason ? req.user.id : null,
      // BAJA real desactiva; limpiar el motivo (reason=null) reactiva SOLO si la baja vino de
      // este mismo mecanismo (unassignedReason ya era 'BAJA') -- nunca revierte una baja
      // marcada por otra via (snapshot historico, scripts manuales).
      active:
        normalizedReason === 'BAJA'
          ? false
          : normalizedReason === null && emp.unassignedReason === 'BAJA'
            ? true
            : emp.active,
      updatedAt: new Date(),
    })
    .where(eq(employeeTable.id, employeeId))
    .returning()

  return res.status(200).json({ employee: updated })
})
