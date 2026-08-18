import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../../../server-lib/prisma.js'
import { requireRole } from '../../../server-lib/auth.js'

export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const id = req.query.id ?? req.params?.id

  const temporaryPassword = crypto.randomBytes(9).toString('base64url')
  const passwordHash = await bcrypt.hash(temporaryPassword, 12)

  try {
    await prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    })
    // Se devuelve UNA sola vez para que el admin se la entregue al usuario. Nunca se
    // vuelve a poder consultar despues (no se guarda en texto plano en ningun lado).
    return res.status(200).json({ temporaryPassword })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' })
    throw e
  }
})
