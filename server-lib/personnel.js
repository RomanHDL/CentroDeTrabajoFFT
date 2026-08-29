// Helpers compartidos por api/personnel/* -- equivalente real (Postgres/Drizzle) de
// src/data/personnel/repository.js (localStorage). No se importa ese archivo aqui: depende de
// store.js (localStorage, solo navegador) y no puede correr en el servidor; esta es una
// reimplementacion fiel de su misma logica de negocio sobre DailyAssignment/EmployeeMovement.
//
// Fase 3 (MI Stack Reference, Prisma -> Drizzle): PILOTO de la migracion --
// este archivo concentra los 3 patrones dificiles (transaccion + `FOR
// UPDATE` crudo, lookup por clave compuesta, upsert) que el resto de
// server-lib/api/* tambien necesita, asi que se porto primero. Misma
// logica de negocio linea por linea que el server-lib/personnel.js
// original (ver git history) -- solo cambia el ORM.
import { and, eq, ne, or, sql } from 'drizzle-orm'
import {
  db,
  employee,
  dailyAssignment,
  employeeMovement,
  attendance,
  workstation,
  workArea,
} from './db/client.js'
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
  const [area] = await db
    .select()
    .from(workArea)
    .where(or(eq(workArea.code, workAreaIdOrCode), eq(workArea.id, workAreaIdOrCode)))
    .limit(1)
  if (!area) return null
  const [station] = await db
    .select()
    .from(workstation)
    .where(and(eq(workstation.workAreaId, area.id), eq(workstation.name, stationName)))
    .limit(1)
  return station || null
}
/**
 * Coloca a un empleado en una estacion HOY -- equivalente real de checkInEmployee/moveEmployee
 * (repository.js). Corre dentro de una transaccion que hace `SELECT ... FOR UPDATE` sobre la
 * estacion destino para serializar checkins/movimientos concurrentes contra la MISMA estacion
 * (segunda capa de defensa ademas del indice unico parcial de DailyAssignment -- ver la nota en
 * server-lib/db/schema.ts junto a ese uniqueIndex().where(...)).
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
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM "Workstation" WHERE id = ${workstationId} FOR UPDATE`)
    // BAJA real (Employee.active=false) nunca puede registrarse/asignarse/moverse, sin importar
    // el modo -- cubre checkin/move/approve-move desde un solo lugar (los 3 pasan por aqui).
    const [emp] = await tx
      .select({ active: employee.active })
      .from(employee)
      .where(eq(employee.id, employeeId))
      .limit(1)
    if (!emp || !emp.active) return { status: 'INACTIVE_EMPLOYEE' }
    const today = todayDateOnly()
    const effectiveShift = shift || 'GENERAL'
    // Bug real encontrado 2026-08-27 ("Cesar Hernandez Hernandez"/"Migdalia Georgina Ramirez
    // Díaz" desaparecieron del layout de WC LINEA 2): `current` NO se filtra por date: today --
    // una asignacion ACTIVE real nunca "expira" sola a medianoche (no existe ningun rollover de
    // dia que la cierre), asi que sigue siendo la ubicacion vigente del empleado sin importar
    // que dia quedo registrada. Filtrar por date:today aqui hacia que CHECKIN no detectara el
    // conflicto real (abriendo la puerta al bug de duplicados ya corregido arriba) y que MOVE
    // fallara con NO_CURRENT_ASSIGNMENT para cualquiera cuya ultima asignacion real no fuera de
    // "hoy" exacto (cruce de medianoche/zona horaria entre cliente y servidor) -- el intercambio
    // real (swap) fallaba en silencio exactamente por esto.
    const [current] = await tx
      .select()
      .from(dailyAssignment)
      .where(and(eq(dailyAssignment.employeeId, employeeId), eq(dailyAssignment.status, 'ACTIVE')))
      .limit(1)
    if (mode === 'CHECKIN' && current) {
      const [existingAttendance] = await tx
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.employeeId, employeeId),
            eq(attendance.date, today),
            eq(attendance.shift, effectiveShift),
          ),
        )
        .limit(1)
      return {
        status: 'CONFLICT',
        assignment: current,
        existingAttendance: existingAttendance || null,
      }
    }
    if (mode === 'MOVE' && !current) return { status: 'NO_CURRENT_ASSIGNMENT' }
    // Cierra cualquier OTRA fila ACTIVE de este empleado que no sea `current` (que arriba solo
    // se busca con date: today). Bug real encontrado 2026-08-27: si la ultima asignacion real de
    // un empleado quedo fechada un dia distinto a "hoy" (nadie la toco el dia que cambio --
    // cruce de medianoche/zona horaria entre cliente y servidor), el lookup de `current` no la
    // encontraba, y un checkin nuevo creaba una SEGUNDA fila ACTIVE en vez de reemplazarla --
    // duplicados reales confirmados y corregidos a mano en Accesorios/Paletizado/Conveyor/WC
    // LINEA 1. Corre para TODOS los casos que llegan hasta aqui (incluido el no-op de abajo) sin
    // cambiar el comportamiento visible de checkin/move/release -- CONFLICT/NO_CURRENT_ASSIGNMENT
    // arriba y STATION_FULL abajo siguen decidiendose exactamente igual que antes, solo por
    // `current` con date: today; esto solo garantiza que nunca quede una fila ACTIVE zombie de
    // un dia anterior dando vueltas.
    // NOTA (fase 3, Prisma -> Drizzle): DailyAssignment.updatedAt es `@updatedAt` en el schema
    // Prisma original -- eso era un comportamiento del CLIENTE de Prisma (sin default/trigger a
    // nivel de columna, confirmado en server-lib/db/schema.ts), asi que Drizzle no lo replica
    // solo -- hay que ponerlo a mano en cada insert/update de esta tabla para mantener el mismo
    // comportamiento observable de antes.
    const closeOthersConditions = [
      eq(dailyAssignment.employeeId, employeeId),
      eq(dailyAssignment.status, 'ACTIVE'),
    ]
    if (current) closeOthersConditions.push(ne(dailyAssignment.id, current.id))
    await tx
      .update(dailyAssignment)
      .set({
        status: 'ENDED',
        endedAt: new Date(),
        endedByUserId: actingUserId,
        endReason: 'MOVED',
        updatedAt: new Date(),
      })
      .where(and(...closeOthersConditions))
    if (current && current.workstationId === workstationId)
      return { status: 'OK', assignment: current }
    const [station] = await tx
      .select()
      .from(workstation)
      .where(eq(workstation.id, workstationId))
      .limit(1)
    // Mismo motivo que `current` arriba: sin date:today, para que un ocupante con asignacion
    // ACTIVE de un dia anterior siga contando de verdad contra la capacidad real de la estacion.
    const [{ occupied }] = await tx
      .select({ occupied: sql`count(*)::int` })
      .from(dailyAssignment)
      .where(
        and(eq(dailyAssignment.workstationId, workstationId), eq(dailyAssignment.status, 'ACTIVE')),
      )
    if (occupied >= station.capacity) {
      return {
        status: 'STATION_FULL',
        occupiedCount: occupied,
        capacity: station.capacity,
      }
    }
    if (current) {
      await tx
        .update(dailyAssignment)
        .set({
          status: 'ENDED',
          endedAt: new Date(),
          endedByUserId: actingUserId,
          endReason: 'MOVED',
          updatedAt: new Date(),
        })
        .where(eq(dailyAssignment.id, current.id))
    }
    const [assignment] = await tx
      .insert(dailyAssignment)
      .values({
        employeeId,
        date: today,
        shift: effectiveShift,
        workstationId,
        status: 'ACTIVE',
        assignedByUserId: actingUserId,
        updatedAt: new Date(),
      })
      .returning()
    await tx.insert(employeeMovement).values({
      employeeId,
      date: today,
      fromWorkstationId: current ? current.workstationId : null,
      toWorkstationId: workstationId,
      movedByUserId: actingUserId,
    })
    await tx
      .update(employee)
      .set({ baselineSuppressed: false, updatedAt: new Date() })
      .where(and(eq(employee.id, employeeId), eq(employee.baselineSuppressed, true)))
    // Un CHECKIN exitoso siempre es la primera asignacion del dia para este empleado (si ya
    // tuviera una, la rama de arriba habria devuelto CONFLICT antes de llegar aqui) -- por eso
    // el pase de lista real (Attendance) se registra aqui, atomico con la asignacion.
    // onConflictDoNothing por seguridad (no debería existir ya, pero evita un error 500 si
    // alguna vez lo hay) -- equivalente exacto del upsert(update: {}) de Prisma.
    if (mode === 'CHECKIN') {
      await tx
        .insert(attendance)
        .values({
          employeeId,
          date: today,
          shift: effectiveShift,
          checkInAt: new Date(),
          status: 'PRESENTE',
          registeredByUserId: actingUserId,
        })
        .onConflictDoNothing({ target: [attendance.employeeId, attendance.date, attendance.shift] })
    }
    return { status: 'OK', assignment }
  })
}
