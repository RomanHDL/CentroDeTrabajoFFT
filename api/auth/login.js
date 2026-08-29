import bcrypt from 'bcryptjs'
import { eq, or } from 'drizzle-orm'
import { db, user } from '../../server-lib/db/client.ts'
import { signSessionToken, buildSessionCookie, publicUser } from '../../server-lib/auth.js'
import { getEffectiveModulesForUser } from '../../server-lib/permissionService.ts'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { identifier, password } = req.body || {}
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Indica tu numero de empleado/usuario y contraseña' })
  }

  const [found] = await db
    .select()
    .from(user)
    .where(or(eq(user.employeeNumber, identifier), eq(user.username, identifier)))
    .limit(1)
  if (!found) return res.status(401).json({ error: 'Credenciales incorrectas' })
  if (!found.active) return res.status(403).json({ error: 'Usuario inactivo' })

  const valid = await bcrypt.compare(password, found.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' })

  // NOTA (fase 3, Prisma -> Drizzle): User.updatedAt no tiene default de Postgres -- se pone
  // a mano, igual que en el resto de updates a esta tabla.
  const [updated] = await db
    .update(user)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(user.id, found.id))
    .returning()

  const token = signSessionToken(found.id)
  res.setHeader('Set-Cookie', buildSessionCookie(token))
  const effectiveModules = await getEffectiveModulesForUser({
    userId: updated.id,
    role: updated.role,
  })
  return res.status(200).json({ user: publicUser(updated), effectiveModules })
}
