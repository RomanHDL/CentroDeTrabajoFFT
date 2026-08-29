// Equivalente real de checkInEmployee (repository.js).
import { eq } from 'drizzle-orm'
import { db, employee as employeeTable } from '../../server-lib/db/client.js'
import { requireAuth } from '../../server-lib/auth.js'
import { resolveWorkstation, placeEmployee } from '../../server-lib/personnel.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { employeeId, employeeNumber, name, workAreaId, stationName, shift } = req.body || {}
  const number = employeeNumber != null ? String(employeeNumber).trim() : ''

  if (!employeeId && !number && !name) {
    return res.status(400).json({ error: 'Captura un número de empleado o nombre.' })
  }
  if (!workAreaId) return res.status(400).json({ error: 'Selecciona el área/línea.' })
  if (!stationName) return res.status(400).json({ error: 'Selecciona el rol/estación.' })

  let employee = null

  if (employeeId) {
    employee = (
      await db.select().from(employeeTable).where(eq(employeeTable.id, employeeId)).limit(1)
    )[0]
    if (!employee) return res.status(404).json({ error: 'Empleado no encontrado.' })
  } else if (number) {
    employee = (
      await db.select().from(employeeTable).where(eq(employeeTable.employeeNumber, number)).limit(1)
    )[0]
    if (!employee) {
      if (!name || !name.trim()) {
        return res.status(200).json({ status: 'NEEDS_NAME', employeeNumber: number })
      }
      try {
        employee = (
          await db
            .insert(employeeTable)
            .values({ employeeNumber: number, fullName: name.trim(), updatedAt: new Date() })
            .returning()
        )[0]
      } catch (e) {
        // Fase 3 (Prisma -> Drizzle): P2002 (Prisma) -> 23505 unique_violation (pg nativo).
        if (e.code === '23505') {
          return res
            .status(409)
            .json({ error: `El número de empleado ${number} ya está en uso por otra persona.` })
        }
        throw e
      }
    }
  } else {
    // Sin numero de empleado -- alta tipo "PROYECTO" (persona real sin numero confirmado
    // todavia), identificada por nombre. employeeNumber se guarda null, NUNCA el literal
    // 'PROYECTO'/'PENDIENTE' (esos son solo etiquetas de presentacion del frontend).
    employee = (
      await db
        .insert(employeeTable)
        .values({ employeeNumber: null, fullName: name.trim(), updatedAt: new Date() })
        .returning()
    )[0]
  }

  const workstation = await resolveWorkstation(workAreaId, stationName)
  if (!workstation) return res.status(400).json({ error: 'Área/estación inválida.' })

  const result = await placeEmployee({
    employeeId: employee.id,
    workstationId: workstation.id,
    shift,
    actingUserId: req.user.id,
    mode: 'CHECKIN',
  })

  if (result.status === 'INACTIVE_EMPLOYEE') {
    return res
      .status(400)
      .json({ error: 'Este empleado está marcado como baja y no puede registrarse.' })
  }
  if (result.status === 'CONFLICT') {
    return res.status(409).json({
      error: 'El empleado ya tiene una asignación activa hoy.',
      assignment: result.assignment,
      existingAttendance: result.existingAttendance,
    })
  }
  if (result.status === 'STATION_FULL') {
    return res.status(409).json({
      error: `${stationName} ya está completa (${result.occupiedCount}/${result.capacity}).`,
    })
  }
  return res.status(201).json({ employee, assignment: result.assignment })
})
