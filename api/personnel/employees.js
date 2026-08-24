import { prisma } from '../../server-lib/prisma.js'
import { requireAuth } from '../../server-lib/auth.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const employees = await prisma.employee.findMany({
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      employeeNumber: true,
      fullName: true,
      areaZona: true,
      fechaIngreso: true,
      baselineSuppressed: true,
      active: true,
    },
  })
  return res.status(200).json({ employees })
})
