// Catalogo dinamico de causas de demora (2026-09-08, a peticion explicita del usuario -- "solo yo
// pueda agregar mas demoras" para no depender de un cambio de codigo cada vez). Mismo criterio
// exacto que api/hora-por-hora/causes/index.js: GET lo consume tanto el selector de captura (solo
// activas) como la pantalla de administracion (todas, via ?includeInactive=1); POST (crear causa
// nueva) es exclusivo de ADMINISTRADOR. Las 15 causas originales (src/data/demoras/catalog.js)
// viven aparte, sin fila aqui -- esta tabla es solo el complemento que un admin agregue despues.
import { asc, eq } from 'drizzle-orm'
import { requireAuth } from '../../../server-lib/auth.js'
import { db, downtimeReason } from '../../../server-lib/db/client.js'
import { canUserAccessModule } from '../../../server-lib/permissionService.js'
import { DOWNTIME_REASON_KEYS } from '../../../src/data/demoras/catalog.js'

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function handleGet(req, res) {
  const includeInactive = req.query?.includeInactive === '1'
  const rows = includeInactive
    ? await db.select().from(downtimeReason).orderBy(asc(downtimeReason.sortOrder))
    : await db
        .select()
        .from(downtimeReason)
        .where(eq(downtimeReason.active, true))
        .orderBy(asc(downtimeReason.sortOrder))
  return res.status(200).json({ reasons: rows })
}

async function handlePost(req, res) {
  if (req.user.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo un administrador puede agregar causas de demora.' })
  }
  const trimmedName = req.body?.name?.trim()
  if (!trimmedName) return res.status(400).json({ error: 'Falta el nombre de la causa.' })

  const baseCode = slugify(trimmedName) || 'causa'
  const existing = await db
    .select({ code: downtimeReason.code, sortOrder: downtimeReason.sortOrder })
    .from(downtimeReason)
  const existingCodes = new Set(existing.map((r) => r.code))
  let code = baseCode
  let n = 2
  while (existingCodes.has(code) || DOWNTIME_REASON_KEYS.has(code)) {
    code = `${baseCode}-${n}`
    n += 1
  }
  const nextOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) + 10 : 10

  const [created] = await db
    .insert(downtimeReason)
    .values({ name: trimmedName, code, sortOrder: nextOrder })
    .returning()

  return res.status(201).json({ reason: created })
}

export default requireAuth(async (req, res) => {
  const allowed = await canUserAccessModule({
    userId: req.user.id,
    role: req.user.role,
    moduleKey: '/demoras',
  })
  if (!allowed) return res.status(403).json({ error: 'No autorizado para este modulo' })

  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
})
