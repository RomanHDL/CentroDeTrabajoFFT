import { prisma } from '../../server-lib/prisma.js'
import { requireRole, publicUser } from '../../server-lib/auth.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id ?? req.params?.id
  const { name, employeeNumber, username, role, active, employeeId } = req.body || {}

  const data = {}
  if (name !== undefined) data.name = name
  if (employeeNumber !== undefined) data.employeeNumber = employeeNumber || null
  if (username !== undefined) data.username = username || null
  if (employeeId !== undefined) data.employeeId = employeeId || null
  if (active !== undefined) data.active = active
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol invalido' })
    data.role = role
  }

  try {
    const user = await prisma.user.update({ where: { id }, data })
    return res.status(200).json({ user: publicUser(user) })
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: `Ya existe un usuario con ese ${e.meta?.target?.[0] ?? 'valor unico'}` })
    }
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' })
    throw e
  }
})
