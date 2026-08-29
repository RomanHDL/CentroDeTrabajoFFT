import { getSessionUser, publicUser } from '../../server-lib/auth.js'
import { getEffectiveModulesForUser } from '../../server-lib/permissionService.ts'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const user = await getSessionUser(req)
  if (!user) return res.status(401).json({ error: 'No autenticado' })
  const effectiveModules = await getEffectiveModulesForUser({ userId: user.id, role: user.role })
  return res.status(200).json({ user: publicUser(user), effectiveModules })
}
