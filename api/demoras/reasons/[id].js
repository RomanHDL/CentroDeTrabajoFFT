// Editar una causa dinamica existente (nombre/activo/orden) -- 2026-09-08, mismo criterio exacto
// que api/hora-por-hora/causes/[id].js: nunca DELETE fisico. Desactivar (active:false) es la
// unica forma de "quitarla" del selector de captura; su historico (DowntimeRecord.reasonKey) se
// conserva intacto aunque la causa se desactive despues.
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../../server-lib/auth.js'
import { db, downtimeReason } from '../../../server-lib/db/client.js'
import { canUserAccessModule } from '../../../server-lib/permissionService.js'

export default requireAuth(async (req, res) => {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
  const allowed = await canUserAccessModule({
    userId: req.user.id,
    role: req.user.role,
    moduleKey: '/demoras',
  })
  if (!allowed) return res.status(403).json({ error: 'No autorizado para este modulo' })
  if (req.user.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo un administrador puede editar causas.' })
  }

  const id = req.query.id ?? req.params?.id
  const { name, active, sortOrder } = req.body || {}

  const [existing] = await db
    .select()
    .from(downtimeReason)
    .where(eq(downtimeReason.id, id))
    .limit(1)
  if (!existing) return res.status(404).json({ error: 'Causa no encontrada.' })

  const values = { updatedAt: new Date() }
  if (name !== undefined) {
    const trimmed = name.trim()
    if (!trimmed) return res.status(400).json({ error: 'El nombre no puede estar vacio.' })
    values.name = trimmed
  }
  if (active !== undefined) values.active = Boolean(active)
  if (sortOrder !== undefined) {
    const order = Number(sortOrder)
    if (!Number.isFinite(order)) return res.status(400).json({ error: 'Orden invalido.' })
    values.sortOrder = order
  }

  const [updated] = await db
    .update(downtimeReason)
    .set(values)
    .where(eq(downtimeReason.id, id))
    .returning()

  return res.status(200).json({ reason: updated })
})
