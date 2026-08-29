import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, user } from '../../../server-lib/db/client.ts'
import { requireModuleAccess } from '../../../server-lib/auth.js'

// POST body opcional { password?: string }. Sin password: comportamiento de
// siempre (genera una aleatoria, forza mustChangePassword). Con password
// (min 8 caracteres): el admin la define el mismo -- se guarda tal cual la
// escribio, mustChangePassword=false porque fue una decision deliberada, no
// un valor desechable.
export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const id = req.query.id ?? req.params?.id
  const { password } = req.body || {}

  if (password !== undefined && password !== null) {
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    // Fase 3 (Prisma -> Drizzle): P2025 -> 0 filas de `.returning()`, se checa a mano.
    const [updated] = await db
      .update(user)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning()
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' })
    return res.status(200).json({ ok: true, mode: 'manual' })
  }

  const temporaryPassword = crypto.randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)

  const [updated] = await db
    .update(user)
    .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning()
  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' })
  // Se devuelve UNA sola vez para que el admin se la entregue al usuario. Nunca se
  // vuelve a poder consultar despues (no se guarda en texto plano en ningun lado).
  return res.status(200).json({ temporaryPassword, mode: 'random' })
})
