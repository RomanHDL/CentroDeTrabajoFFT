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
//
// employeeId puede faltar (2026-09-02, bug real: "Denilson"/"Mireya" -- personas que EXISTEN
// solo en el snapshot estatico, nunca se han registrado/movido/checkeado, asi que no tienen
// fila activa en Employee todavia -- el cliente nunca pudo resolver un serverId para ellas,
// asi que syncSetUnassignedReason (apiSync.js) siempre tiraba "no sincronizado". Igual que
// checkin.js (primer touch real de un PROYECTO), aqui tambien se resuelve o crea por
// employeeNumber/name cuando no hay employeeId -- MISMO patron, incluida la regla de nunca
// buscar por nombre cuando no hay numero real (evita reactivar/pisar un fantasma inactivo que
// comparta nombre, ver comentario grande de colision en apiSync.js/checkin.js).
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../server-lib/auth.js'
import { db, employee as employeeTable } from '../../server-lib/db/client.js'

const VALID_REASONS = new Set(['BAJA', 'TURNO', 'FALTA'])

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId, employeeNumber, name, reason } = req.body || {}
  const number = employeeNumber != null ? String(employeeNumber).trim() : ''
  if (!employeeId && !number && !name) {
    return res.status(400).json({ error: 'Falta employeeId o nombre.' })
  }
  if (reason !== null && reason !== undefined && !VALID_REASONS.has(reason)) {
    return res.status(400).json({ error: 'Motivo inválido.' })
  }

  let emp = null
  if (employeeId) {
    ;[emp] = await db
      .select()
      .from(employeeTable)
      .where(eq(employeeTable.id, employeeId))
      .limit(1)
    if (!emp) return res.status(404).json({ error: 'Empleado no encontrado.' })
  } else if (number) {
    ;[emp] = await db
      .select()
      .from(employeeTable)
      .where(eq(employeeTable.employeeNumber, number))
      .limit(1)
    if (!emp) {
      if (!name || !name.trim()) return res.status(400).json({ error: 'Falta nombre.' })
      try {
        ;[emp] = await db
          .insert(employeeTable)
          .values({ employeeNumber: number, fullName: name.trim(), updatedAt: new Date() })
          .returning()
      } catch (e) {
        if (e.code === '23505') {
          return res
            .status(409)
            .json({ error: `El número de empleado ${number} ya está en uso por otra persona.` })
        }
        throw e
      }
    }
  } else {
    // Sin numero -- alta tipo "PROYECTO", igual que checkin.js: NUNCA busca por nombre,
    // siempre crea una fila nueva (evita reactivar/pisar un fantasma inactivo homonimo).
    ;[emp] = await db
      .insert(employeeTable)
      .values({ employeeNumber: null, fullName: name.trim(), updatedAt: new Date() })
      .returning()
  }

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
    .where(eq(employeeTable.id, emp.id))
    .returning()

  return res.status(200).json({ employee: updated })
})
