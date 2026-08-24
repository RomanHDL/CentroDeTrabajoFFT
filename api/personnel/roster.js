// Placement efectivo por empleado para una fecha -- equivalente real de getPeopleByArea/
// getEffectiveTodayRoster (personnelByArea.js), simplificado a 3 estados explicitos:
//
//   LIVE     -> tiene una DailyAssignment ACTIVE esa fecha (siempre gana).
//   NONE     -> tiene alguna DailyAssignment esa fecha pero NINGUNA esta ACTIVE ahora mismo
//               (p. ej. fue liberado hoy via /release) -- "tocado hoy", NUNCA revierte a su
//               ubicacion historica el mismo dia (equivalente de `touchedToday` en
//               personnelByArea.js, que ahi se calcula desde movimientos; aqui se calcula desde
//               DailyAssignment porque /release no genera EmployeeMovement -- ver nota en
//               release.js sobre el NOT NULL de EmployeeMovement.toWorkstationId).
//   SNAPSHOT -> ninguna DailyAssignment esa fecha, baselineSuppressed=false y areaZona no es
//               null -- se ubica por su zona historica de BASE/SEM 34 (areaZona se devuelve TAL
//               CUAL viene de Employee, sin normalizar via mapAreaZonaToId -- esa normalizacion
//               es responsabilidad de quien consuma este endpoint, igual que hoy hace el
//               frontend en personnelByArea.js).
//   NONE     -> tambien cuando no aplica ninguno de los anteriores (nunca tuvo zona, o esta
//               baselineSuppressed).
import { prisma } from '../../server-lib/prisma.js'
import { requireAuth } from '../../server-lib/auth.js'
import { parseDateOnly } from '../../server-lib/personnel.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const date = parseDateOnly(req.query.date)
  if (!date) return res.status(400).json({ error: 'Fecha invalida, usa YYYY-MM-DD.' })

  const [employees, assignmentsForDate, pendingMoves] = await Promise.all([
    prisma.employee.findMany({
      select: { id: true, employeeNumber: true, fullName: true, areaZona: true, baselineSuppressed: true },
    }),
    prisma.dailyAssignment.findMany({
      where: { date },
      include: { workstation: { include: { workArea: true } } },
    }),
    prisma.pendingMove.findMany({
      where: { date, status: 'PENDING' },
      include: {
        employee: { select: { id: true, employeeNumber: true, fullName: true } },
        toWorkstation: { include: { workArea: true } },
        fromWorkstation: { include: { workArea: true } },
      },
    }),
  ])

  const activeByEmployee = new Map()
  const touchedToday = new Set()
  assignmentsForDate.forEach((a) => {
    touchedToday.add(a.employeeId)
    if (a.status === 'ACTIVE') activeByEmployee.set(a.employeeId, a)
  })

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
  })
})
