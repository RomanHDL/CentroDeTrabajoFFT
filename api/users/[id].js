import { eq } from 'drizzle-orm'
import { db, user } from '../../server-lib/db/client.ts'
import { requireModuleAccess, publicUser } from '../../server-lib/auth.js'

const VALID_ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'LIDER']

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const id = req.query.id ?? req.params?.id
  const { name, employeeNumber, username, role, active, employeeId } = req.body || {}

  // NOTA (fase 3, Prisma -> Drizzle): User.updatedAt no tiene default de Postgres (era
  // @updatedAt del cliente Prisma) -- se pone a mano en TODO update, igual que antes se
  // actualizaba automaticamente en cualquier prisma.user.update, incluso con data={}.
  const data = { updatedAt: new Date() }
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
    const [updated] = await db.update(user).set(data).where(eq(user.id, id)).returning()
    // Fase 3 (Prisma -> Drizzle): P2025 (Prisma, "record not found") -> Drizzle simplemente
    // devuelve 0 filas de `.returning()`, no lanza -- se checa explicitamente.
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' })
    return res.status(200).json({ user: publicUser(updated) })
  } catch (e) {
    // P2002 (Prisma) -> 23505 unique_violation (pg nativo), mismo criterio que api/users/index.js.
    if (e.code === '23505') {
      const target = e.constraint?.replace(/^User_/, '').replace(/_key$/, '') ?? 'valor unico'
      return res.status(409).json({ error: `Ya existe un usuario con ese ${target}` })
    }
    throw e
  }
})
