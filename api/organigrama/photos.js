// Manifiesto de fotos reales del Organigrama (2026-09-14) -- devuelve SOLO
// { personId: updatedAtISO } para quien ya tenga una foto subida en OrgChartPhoto, para que el
// cliente sepa a quien pedirle /api/organigrama/:id/photo (en vez de intentarlo para las 10
// personas y comerse 404s de las que no tienen foto todavia). Cualquier usuario logueado puede
// verlo -- es informacion de lectura, igual que el resto del organigrama.
import { requireAuth } from '../../server-lib/auth.js'
import { db, orgChartPhoto } from '../../server-lib/db/client.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const rows = await db
    .select({ personId: orgChartPhoto.personId, updatedAt: orgChartPhoto.updatedAt })
    .from(orgChartPhoto)

  const photos = {}
  for (const row of rows) photos[row.personId] = row.updatedAt.toISOString()
  return res.status(200).json({ photos })
})
