import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db, user } from '../../server-lib/db/client.js'
import { requireAuth, publicUser } from '../../server-lib/auth.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { currentPassword, newPassword } = req.body || {}
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' })
  }

  // Si viene de una contraseña temporal (mustChangePassword), no exigimos la actual
  // ni el rol — es un paso de seguridad obligatorio para cualquiera. El cambio
  // VOLUNTARIO (ya sin contraseña temporal) queda restringido a ADMINISTRADOR;
  // el frontend ya oculta/redirige esto, esto es defensa en profundidad por si
  // alguien llega aqui evitando la UI.
  if (!req.user.mustChangePassword) {
    if (req.user.role !== 'ADMINISTRADOR') {
      return res
        .status(403)
        .json({ error: 'Solo un administrador puede cambiar su contraseña libremente' })
    }
    if (!currentPassword) {
      return res.status(400).json({ error: 'Indica tu contraseña actual' })
    }
    const valid = await bcrypt.compare(currentPassword, req.user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' })
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const [updated] = await db
    .update(user)
    .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(user.id, req.user.id))
    .returning()

  return res.status(200).json({ user: publicUser(updated) })
})
