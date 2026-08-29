// Equivalente real de getBaselineOnlyPeopleIds + suppressBaselinePlacement (personnelByArea.js/
// repository.js), usado por "Vaciar layout" (ClearLayoutPanel.jsx): marca baselineSuppressed=true
// en todo Employee que HOY se ubicaria SOLO por su zona historica (areaZona), sin tocar a nadie
// que ya tenga una asignacion real de hoy -- incluye tanto ACTIVE como ENDED (alguien liberado
// hoy vía /release tambien cuenta como "tocado hoy", igual que `touchedToday` en
// personnelByArea.js, que ahi viene de movimientos; aqui se deriva de DailyAssignment por la
// misma razon documentada en release.js).
//
// Alcance reducido 2026-08-24 (BUG REAL detectado en produccion: este endpoint suprimia a TODO
// Employee con areaZona, no solo a las CT LINEA -- el filtro `areaZona: { not: null }` nunca se
// actualizo cuando getBaselineOnlyPeopleIds() en personnelByArea.js SI se acoto a solo lineas
// (ver PROTECTED_FROM_LAYOUT_CLEAR_AREAS ahi). Un click real en "Vaciar layout" dejo a 108 de 119
// empleados suprimidos -- Calidad, Accesorios, Paletizado, Soporte, etc. -- en vez de solo los de
// linea. Reparado a mano en la base de datos real y AHORA reparado aqui: solo se suprime a quien
// tenga areaZona "LINEA N" (cualquier numero) o "PRODUCCION" (generico, sin linea especifica
// confirmada) -- exactamente el mismo alcance que el cliente.
import { and, eq, inArray, like, notInArray, or } from 'drizzle-orm'
import { db, dailyAssignment, employee } from '../../server-lib/db/client.js'
import { requireModuleAccess } from '../../server-lib/auth.js'
import { todayDateOnly } from '../../server-lib/personnel.js'

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const today = todayDateOnly()
  const touchedToday = await db
    .selectDistinctOn([dailyAssignment.employeeId], { employeeId: dailyAssignment.employeeId })
    .from(dailyAssignment)
    .where(eq(dailyAssignment.date, today))
  const touchedIds = touchedToday.map((a) => a.employeeId)

  const candidates = await db
    .select({ id: employee.id })
    .from(employee)
    .where(
      and(
        eq(employee.baselineSuppressed, false),
        or(like(employee.areaZona, 'LINEA %'), eq(employee.areaZona, 'PRODUCCION')),
        notInArray(employee.id, touchedIds.length ? touchedIds : ['__none__']),
      ),
    )
  const ids = candidates.map((c) => c.id)

  if (ids.length) {
    await db
      .update(employee)
      .set({ baselineSuppressed: true, updatedAt: new Date() })
      .where(inArray(employee.id, ids))
  }
  return res.status(200).json({ suppressedCount: ids.length, employeeIds: ids })
})
