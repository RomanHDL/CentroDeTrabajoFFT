import bcrypt from 'bcryptjs'
import { asc } from 'drizzle-orm'
import { db, user } from '../../server-lib/db/client.js'
import { requireModuleAccess, publicUser } from '../../server-lib/auth.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method === 'GET') {
    const users = await db.select().from(user).orderBy(asc(user.createdAt))
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
      return res
        .status(400)
        .json({ error: 'La contraseña temporal debe tener al menos 8 caracteres' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    try {
      const [created] = await db
        .insert(user)
        .values({
          employeeNumber: employeeNumber || null,
          username: username || null,
          name,
          role,
          passwordHash,
          active: active ?? true,
          mustChangePassword: true,
          employeeId: employeeId || null,
          updatedAt: new Date(),
        })
        .returning()
      return res.status(201).json({ user: publicUser(created) })
    } catch (e) {
      // Fase 3 (Prisma -> Drizzle): P2002 (Prisma) -> 23505 unique_violation (pg nativo).
      // `e.constraint` es el nombre real del indice unico (ej. "User_username_key");
      // se deriva la columna del mismo modo que antes devolvia e.meta.target[0].
      if (e.code === '23505') {
        const target = e.constraint?.replace(/^User_/, '').replace(/_key$/, '') ?? 'valor unico'
        return res.status(409).json({ error: `Ya existe un usuario con ese ${target}` })
      }
      throw e
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
})
