import { eq } from 'drizzle-orm'
import { db, user } from '../../../server-lib/db/client.js'
import { requireModuleAccess, publicUser } from '../../../server-lib/auth.js'

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const id = req.query.id ?? req.params?.id
  // Fase 3 (Prisma -> Drizzle): P2025 -> 0 filas de `.returning()`, se checa a mano.
  const [updated] = await db
    .update(user)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(user.id, id))
    .returning()
  if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' })
  return res.status(200).json({ user: publicUser(updated) })
})
