import { asc } from 'drizzle-orm'
import { db, employee } from '../../server-lib/db/client.ts'
import { requireAuth } from '../../server-lib/auth.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const employees = await db
    .select({
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      areaZona: employee.areaZona,
      fechaIngreso: employee.fechaIngreso,
      baselineSuppressed: employee.baselineSuppressed,
      active: employee.active,
    })
    .from(employee)
    .orderBy(asc(employee.fullName))
  return res.status(200).json({ employees })
})
