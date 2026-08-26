// Endpoint minimo y de solo lectura para el rediseno del Dashboard (2026-08-25). NO toca ninguna
// tabla de escritura ni logica de negocio existente -- solo expone timestamps reales de
// EmployeeMovement (movedAt SI tiene timestamp real, a diferencia del headcount total del dia, que
// en su mayoria viene del snapshot estatico sin fecha -- ver dashboardMetrics.js para la
// explicacion completa de por que estas series usan movimientos y no "asistencia acumulada").
//
// Devuelve los timestamps CRUDOS (ISO) de los ultimos 8 dias -- el agrupamiento por hora/dia se
// hace en el CLIENTE (useDashboardMetrics.js), nunca aqui: el servidor no sabe en que zona horaria
// esta el navegador de quien pide esto, y agrupar server-side con la hora UTC del proceso producia
// un bug real (dias/horas desalineados con la tarde/noche real de Mexico) -- se detecto y corrigio
// en la primera verificacion visual de este rediseño.
import { prisma } from '../../server-lib/prisma.js'
import { requireAuth } from '../../server-lib/auth.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const windowStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
  const movements = await prisma.employeeMovement.findMany({
    where: { movedAt: { gte: windowStart } },
    select: { movedAt: true },
    orderBy: { movedAt: 'asc' },
  })

  return res.status(200).json({
    movements: movements.map((m) => m.movedAt.toISOString()),
    generatedAt: new Date().toISOString(),
  })
})
