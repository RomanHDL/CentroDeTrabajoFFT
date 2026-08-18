import bcrypt from 'bcryptjs'
import { prisma } from '../../server-lib/prisma.js'
import { requireRole, publicUser } from '../../server-lib/auth.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method === 'GET') {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
    return res.status(200).json({ users: users.map(publicUser) })
  }

  if (req.method === 'POST') {
    const { employeeNumber, username, name, role, password, active, employeeId } = req.body || {}

    if (!employeeNumber && !username) {
      return res.status(400).json({ error: 'Debes indicar employeeNumber o username' })
    }
    if (!name || !role || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos (name, role, password)' })
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol invalido' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña temporal debe tener al menos 8 caracteres' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    try {
      const user = await prisma.user.create({
        data: {
          employeeNumber: employeeNumber || null,
          username: username || null,
          name,
          role,
          passwordHash,
          active: active ?? true,
          mustChangePassword: true,
          employeeId: employeeId || null,
        },
      })
      return res.status(201).json({ user: publicUser(user) })
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(409).json({ error: `Ya existe un usuario con ese ${e.meta?.target?.[0] ?? 'valor unico'}` })
      }
      throw e
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
