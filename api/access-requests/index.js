// Lista de solicitudes de acceso via SSO (2026-09-02) -- mismo guard que api/users/index.js
// (requireModuleAccess('/usuarios'), no un rol fijo) ya que viven en la misma pantalla.
import { desc, eq } from 'drizzle-orm'
import { requireModuleAccess } from '../../server-lib/auth.js'
import { accessRequest, db } from '../../server-lib/db/client.js'

export default requireModuleAccess('/usuarios', async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const rows = status
    ? await db
        .select()
        .from(accessRequest)
        .where(eq(accessRequest.status, status))
        .orderBy(desc(accessRequest.requestedAt))
    : await db.select().from(accessRequest).orderBy(desc(accessRequest.requestedAt))

  return res.status(200).json({ requests: rows })
})
