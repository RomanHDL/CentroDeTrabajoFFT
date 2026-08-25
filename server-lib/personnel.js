// Helpers compartidos por api/personnel/* -- equivalente real (Postgres/Prisma) de
// src/data/personnel/repository.js (localStorage). No se importa ese archivo aqui: depende de
// store.js (localStorage, solo navegador) y no puede correr en el servidor; esta es una
// reimplementacion fiel de su misma logica de negocio sobre DailyAssignment/EmployeeMovement.
import { prisma } from './prisma.js'

export function todayDateOnly() {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
}

// Acepta "YYYY-MM-DD"; null si el formato es invalido. Sin querystring -> hoy.
export function parseDateOnly(value) {
  if (!value) return todayDateOnly()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return new Date(`${value}T00:00:00.000Z`)
}

// `workAreaIdOrCode` acepta tanto el id real de WorkArea como su `code` (LINEA1, PALETIZADO, ...
// -- el mismo id que ya usa catalog.js en el frontend), para que quien llame a la API no necesite
// resolver primero un cuid interno que todavia no conoce.
export async function resolveWorkstation(workAreaIdOrCode, stationName) {
  const workArea = await prisma.workArea.findFirst({
    where: { OR: [{ code: workAreaIdOrCode }, { id: workAreaIdOrCode }] },
  })
  if (!workArea) return null
  return prisma.workstation.findUnique({
    where: { workAreaId_name: { workAreaId: workArea.id, name: stationName } },
  })
}

/**
 * Coloca a un empleado en una estacion HOY -- equivalente real de checkInEmployee/moveEmployee
 * (repository.js). Corre dentro de una transaccion que hace `SELECT ... FOR UPDATE` sobre la
 * estacion destino para serializar checkins/movimientos concurrentes contra la MISMA estacion
 * (segunda capa de defensa ademas del indice unico parcial de DailyAssignment -- ver la nota en
 * schema.prisma junto a ese @@unique).
 *
 * mode 'CHECKIN': si el empleado YA tiene una asignacion ACTIVE hoy, nunca la sobreescribe ->
 *   status CONFLICT (eso es un `move`, no un checkin).
 * mode 'MOVE': requiere que el empleado YA tenga una asignacion ACTIVE hoy (si no, status
 *   NO_CURRENT_ASSIGNMENT); termina esa fila (endReason MOVED, nunca se borra) y crea una nueva.
 *
 * En ambos modos: si la estacion destino ya esta en capacidad, status STATION_FULL (nunca se
 * excede el limite). Un `move` a la MISMA estacion donde ya esta es no-op (no genera un
 * EmployeeMovement redundante). Limpia baselineSuppressed=true si estaba activo (equivalente de
 * unsuppressBaselinePlacement): recibir una asignacion real siempre gana sobre la supresion
 * historica.
 *
 * Empleado con active=false (BAJA real) -> status INACTIVE_EMPLOYEE, en cualquier modo, antes de
 * tocar nada. Un CHECKIN exitoso ademas registra Attendance (pase de lista real, atomico con la
 * asignacion); un CHECKIN en CONFLICT devuelve la Attendance existente de hoy si ya hay una.
 */
export async function placeEmployee({ employeeId, workstationId, shift, actingUserId, mode }) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Workstation" WHERE id = ${workstationId} FOR UPDATE`

    // BAJA real (Employee.active=false) nunca puede registrarse/asignarse/moverse, sin importar
    // el modo -- cubre checkin/move/approve-move desde un solo lugar (los 3 pasan por aqui).
    const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { active: true } })
    if (!employee || !employee.active) return { status: 'INACTIVE_EMPLOYEE' }

    const today = todayDateOnly()
    const current = await tx.dailyAssignment.findFirst({
      where: { employeeId, date: today, status: 'ACTIVE' },
    })

    if (mode === 'CHECKIN' && current) {
      const existingAttendance = await tx.attendance.findUnique({
        where: { employeeId_date_shift: { employeeId, date: today, shift: shift || 'GENERAL' } },
      })
      return { status: 'CONFLICT', assignment: current, existingAttendance: existingAttendance || null }
    }
    if (mode === 'MOVE' && !current) return { status: 'NO_CURRENT_ASSIGNMENT' }
    if (current && current.workstationId === workstationId) return { status: 'OK', assignment: current }

    const workstation = await tx.workstation.findUnique({ where: { id: workstationId } })
    const occupied = await tx.dailyAssignment.count({
      where: { workstationId, date: today, status: 'ACTIVE' },
    })
    if (occupied >= workstation.capacity) {
      return { status: 'STATION_FULL', occupiedCount: occupied, capacity: workstation.capacity }
    }

    if (current) {
      await tx.dailyAssignment.update({
        where: { id: current.id },
        data: { status: 'ENDED', endedAt: new Date(), endedByUserId: actingUserId, endReason: 'MOVED' },
      })
    }

    const assignment = await tx.dailyAssignment.create({
      data: {
        employeeId,
        date: today,
        shift: shift || 'GENERAL',
        workstationId,
        status: 'ACTIVE',
        assignedByUserId: actingUserId,
      },
    })

    await tx.employeeMovement.create({
      data: {
        employeeId,
        date: today,
        fromWorkstationId: current ? current.workstationId : null,
        toWorkstationId: workstationId,
        movedByUserId: actingUserId,
      },
    })

    await tx.employee.updateMany({
      where: { id: employeeId, baselineSuppressed: true },
      data: { baselineSuppressed: false },
    })

    // Un CHECKIN exitoso siempre es la primera asignacion del dia para este empleado (si ya
    // tuviera una, la rama de arriba habria devuelto CONFLICT antes de llegar aqui) -- por eso
    // el pase de lista real (Attendance) se registra aqui, atomico con la asignacion. upsert por
    // seguridad (no debería existir ya, pero evita un 500 si alguna vez lo hay).
    if (mode === 'CHECKIN') {
      await tx.attendance.upsert({
        where: { employeeId_date_shift: { employeeId, date: today, shift: shift || 'GENERAL' } },
        create: {
          employeeId, date: today, shift: shift || 'GENERAL',
          checkInAt: new Date(), status: 'PRESENTE', registeredByUserId: actingUserId,
        },
        update: {},
      })
    }

    return { status: 'OK', assignment }
  })
}
