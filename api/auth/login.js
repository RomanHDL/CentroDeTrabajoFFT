import bcrypt from 'bcryptjs'
import { prisma } from '../../server-lib/prisma.js'
import { signSessionToken, buildSessionCookie, publicUser } from '../../server-lib/auth.js'
import { getEffectiveModulesForUser } from '../../server-lib/permissionService.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { identifier, password } = req.body || {}
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Indica tu numero de empleado/usuario y contraseña' })
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ employeeNumber: identifier }, { username: identifier }] },
  })
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' })
  if (!user.active) return res.status(403).json({ error: 'Usuario inactivo' })

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' })

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const token = signSessionToken(user.id)
  res.setHeader('Set-Cookie', buildSessionCookie(token))
  const effectiveModules = await getEffectiveModulesForUser({
    userId: updated.id,
    role: updated.role,
  })
  return res.status(200).json({ user: publicUser(updated), effectiveModules })
}
