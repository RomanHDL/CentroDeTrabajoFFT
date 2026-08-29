// Placement efectivo por empleado para una fecha -- equivalente real de getPeopleByArea/
// getEffectiveTodayRoster (personnelByArea.js), simplificado a 3 estados explicitos:
//
//   LIVE     -> tiene una DailyAssignment ACTIVE ahora mismo (siempre gana). NO se filtra por
//               fecha (2026-08-27, bug real: "Cesar Hernandez Hernandez"/"Migdalia Georgina
//               Ramirez Díaz" desaparecian del layout de WC LINEA 2) -- una asignacion ACTIVE
//               real nunca "expira" sola a medianoche, sigue siendo la ubicacion vigente del
//               empleado sin importar que dia quedo registrada (mismo criterio que
//               placeEmployee/release.js, ver personnel.js).
//   NONE     -> tiene alguna DailyAssignment de esta fecha pero NINGUNA esta ACTIVE ahora mismo
//               (p. ej. fue liberado hoy via /release) -- "tocado hoy", NUNCA revierte a su
//               ubicacion historica el mismo dia (equivalente de `touchedToday` en
//               personnelByArea.js, que ahi se calcula desde movimientos; aqui se calcula desde
//               DailyAssignment porque /release no genera EmployeeMovement -- ver nota en
//               release.js sobre el NOT NULL de EmployeeMovement.toWorkstationId). Este check SI
//               sigue por fecha exacta a proposito -- alguien liberado HOY cuya fila original
//               traia una fecha distinta es un caso residual raro (release.js no reescribe el
//               campo `date` al terminar una fila), documentado, no corregido en esta ronda.
//   SNAPSHOT -> ninguna DailyAssignment esa fecha, baselineSuppressed=false y areaZona no es
//               null -- se ubica por su zona historica de BASE/SEM 34 (areaZona se devuelve TAL
//               CUAL viene de Employee, sin normalizar via mapAreaZonaToId -- esa normalizacion
//               es responsabilidad de quien consuma este endpoint, igual que hoy hace el
//               frontend en personnelByArea.js).
//   NONE     -> tambien cuando no aplica ninguno de los anteriores (nunca tuvo zona, o esta
//               baselineSuppressed).
//
// Ademas devuelve pendingMoves (PENDING de la fecha) y resolvedMoves (APPROVED/REJECTED resueltas
// en los ultimos 3 minutos) -- src/data/personnel/apiSync.js los fusiona en cada poll de 7s para
// que una solicitud de un LIDER y su resolucion lleguen a otros dispositivos sin recargar.
import { eq } from 'drizzle-orm'
import { db, employee as employeeTable } from '../../server-lib/db/client.js'
import { requireAuth } from '../../server-lib/auth.js'
import { parseDateOnly } from '../../server-lib/personnel.js'

// Reordena el resultado de la relational query de Drizzle (nombres de relacion auto-generados,
// ambiguos por tener 2 FKs a la MISMA tabla Workstation/User, ver server-lib/db/relations.ts:
// workstation_fromWorkstationId/workstation_toWorkstationId/user_requestedByUserId) de vuelta a la
// misma forma que ya devolvia el `include` de Prisma (employee/requestedBy/toWorkstation/
// fromWorkstation) -- el frontend (apiSync.js) espera exactamente esos nombres, sin cambio.
function shapePendingMove(pm) {
  return {
    ...pm,
    requestedBy: pm.user_requestedByUserId,
    toWorkstation: pm.workstation_toWorkstationId,
    fromWorkstation: pm.workstation_fromWorkstationId,
    user_requestedByUserId: undefined,
    workstation_toWorkstationId: undefined,
    workstation_fromWorkstationId: undefined,
  }
}

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const date = parseDateOnly(req.query.date)
  if (!date) return res.status(400).json({ error: 'Fecha invalida, usa YYYY-MM-DD.' })

  const [employees, activeAssignments, assignmentsForDate, pendingMoves, resolvedMoves] =
    await Promise.all([
      // active:true (2026-08-27, bug real): un empleado BAJA/inactivo (incluye los "fantasma"
      // desactivados por colision de nombre, ver personnel.js/apiSync.js) nunca deberia competir
      // por el mismo id local en el frontend (EMPLOYEE_DIRECTORY solo conoce un id por nombre
      // completo para gente sin numero real, ver buildLocalIndex en apiSync.js) -- sin este filtro,
      // el placement 'NONE' del fantasma (ya sin asignacion) pisaba en cada poll el placement
      // 'LIVE' real de la persona activa que comparte su nombre, porque ambos se fusionaban en el
      // mismo id local. Confirmado en vivo: "Cesar Hernandez Hernandez" desaparecia del layout de
      // WC LINEA 2 en cada poll de 2s pese a tener una asignacion ACTIVE real.
      db
        .select({
          id: employeeTable.id,
          employeeNumber: employeeTable.employeeNumber,
          fullName: employeeTable.fullName,
          areaZona: employeeTable.areaZona,
          baselineSuppressed: employeeTable.baselineSuppressed,
        })
        .from(employeeTable)
        .where(eq(employeeTable.active, true)),
      // LIVE: sin filtro de fecha -- ver nota arriba.
      db.query.dailyAssignment.findMany({
        where: (dailyAssignment, { eq }) => eq(dailyAssignment.status, 'ACTIVE'),
        with: { workstation: { with: { workArea: true } } },
      }),
      // Solo para touchedToday (NONE vs SNAPSHOT) -- este SI sigue scoped a la fecha pedida.
      db.query.dailyAssignment.findMany({
        where: (dailyAssignment, { eq }) => eq(dailyAssignment.date, date),
        columns: { employeeId: true },
      }),
      db.query.pendingMove
        .findMany({
          where: (pendingMove, { eq, and }) =>
            and(eq(pendingMove.date, date), eq(pendingMove.status, 'PENDING')),
          with: {
            employee: { columns: { id: true, employeeNumber: true, fullName: true } },
            user_requestedByUserId: { columns: { name: true } },
            workstation_toWorkstationId: { with: { workArea: true } },
            workstation_fromWorkstationId: { with: { workArea: true } },
          },
        })
        .then((rows) => rows.map(shapePendingMove)),
      // Resueltas (APPROVED/REJECTED) recientemente -- ventana corta de 3 minutos, suficiente para
      // que el poll de 7s (apiSync.js) de OTRO dispositivo alcance a notificar a quien la pidio
      // antes de que salga de la ventana. No es un endpoint nuevo, es parte del mismo roster.
      db.query.pendingMove
        .findMany({
          where: (pendingMove, { eq, and, inArray, gte }) =>
            and(
              eq(pendingMove.date, date),
              inArray(pendingMove.status, ['APPROVED', 'REJECTED']),
              gte(pendingMove.resolvedAt, new Date(Date.now() - 3 * 60 * 1000)),
            ),
          with: {
            employee: { columns: { id: true, employeeNumber: true, fullName: true } },
            user_requestedByUserId: { columns: { name: true } },
            workstation_toWorkstationId: { with: { workArea: true } },
            workstation_fromWorkstationId: { with: { workArea: true } },
          },
        })
        .then((rows) => rows.map(shapePendingMove)),
    ])

  const activeByEmployee = new Map()
  activeAssignments.forEach((a) => activeByEmployee.set(a.employeeId, a))
  const touchedToday = new Set(assignmentsForDate.map((a) => a.employeeId))

  const roster = employees.map((employee) => {
    const base = {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      areaZona: employee.areaZona,
      baselineSuppressed: employee.baselineSuppressed,
    }

    const active = activeByEmployee.get(employee.id)
    if (active) {
      return {
        ...base,
        placement: {
          source: 'LIVE',
          workAreaCode: active.workstation.workArea.code,
          workAreaName: active.workstation.workArea.name,
          stationName: active.workstation.name,
          shift: active.shift,
          assignedAt: active.assignedAt,
        },
      }
    }

    if (touchedToday.has(employee.id)) {
      return { ...base, placement: { source: 'NONE' } }
    }

    if (!employee.baselineSuppressed && employee.areaZona) {
      return { ...base, placement: { source: 'SNAPSHOT', areaZona: employee.areaZona } }
    }

    return { ...base, placement: { source: 'NONE' } }
  })

  return res.status(200).json({
    date: date.toISOString().slice(0, 10),
    roster,
    pendingMoves,
    resolvedMoves,
  })
})
