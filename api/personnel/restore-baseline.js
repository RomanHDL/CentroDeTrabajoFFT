// Inverso exacto de suppress-baseline.js (usado por "Restaurar layout de las CT LINEA",
// RestoreLayoutPanel.jsx): marca baselineSuppressed=false en todo Employee suprimido cuya
// areaZona sea de CT LINEA ("LINEA N") o "PRODUCCION" -- el mismo alcance que el propio
// suppress-baseline.js usa para suprimir, para que "restaurar" sea exactamente lo contrario de
// "vaciar", nunca mas ni menos. No toca a nadie con una asignacion real de hoy (esas personas ya
// no dependen del snapshot historico, restaurar el flag no les afecta en nada).
import { prisma } from '../../server-lib/prisma.js'
import { requireModuleAccess } from '../../server-lib/auth.js'

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const candidates = await prisma.employee.findMany({
    where: {
      baselineSuppressed: true,
      OR: [{ areaZona: { startsWith: 'LINEA ' } }, { areaZona: 'PRODUCCION' }],
    },
    select: { id: true },
  })
  const ids = candidates.map((c) => c.id)

  if (ids.length) {
    await prisma.employee.updateMany({
      where: { id: { in: ids } },
      data: { baselineSuppressed: false },
    })
  }
  return res.status(200).json({ restoredCount: ids.length, employeeIds: ids })
})
