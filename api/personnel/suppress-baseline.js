// Equivalente real de getBaselineOnlyPeopleIds + suppressBaselinePlacement (personnelByArea.js/
// repository.js), usado por "Vaciar layout" (ClearLayoutPanel.jsx): marca baselineSuppressed=true
// en todo Employee que HOY se ubicaria SOLO por su zona historica (areaZona), sin tocar a nadie
// que ya tenga una asignacion real de hoy -- incluye tanto ACTIVE como ENDED (alguien liberado
// hoy vía /release tambien cuenta como "tocado hoy", igual que `touchedToday` en
// personnelByArea.js, que ahi viene de movimientos; aqui se deriva de DailyAssignment por la
// misma razon documentada en release.js).
import { prisma } from '../../server-lib/prisma.js'
import { requireRole } from '../../server-lib/auth.js'
import { todayDateOnly } from '../../server-lib/personnel.js'

export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const today = todayDateOnly()
  const touchedToday = await prisma.dailyAssignment.findMany({
    where: { date: today },
    select: { employeeId: true },
    distinct: ['employeeId'],
  })
  const touchedIds = touchedToday.map((a) => a.employeeId)

  const candidates = await prisma.employee.findMany({
    where: {
      baselineSuppressed: false,
      areaZona: { not: null },
      id: { notIn: touchedIds.length ? touchedIds : ['__none__'] },
    },
    select: { id: true },
  })
  const ids = candidates.map((c) => c.id)

  if (ids.length) {
    await prisma.employee.updateMany({ where: { id: { in: ids } }, data: { baselineSuppressed: true } })
  }
  return res.status(200).json({ suppressedCount: ids.length, employeeIds: ids })
})
