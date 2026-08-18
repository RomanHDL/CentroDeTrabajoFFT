import { prisma } from '../../../server-lib/prisma.js'
import { requireRole, publicUser } from '../../../server-lib/auth.js'

export default requireRole(['ADMINISTRADOR'], async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const id = req.query.id ?? req.params?.id
  try {
    const user = await prisma.user.update({ where: { id }, data: { active: false } })
    return res.status(200).json({ user: publicUser(user) })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Usuario no encontrado' })
    throw e
  }
})
