// Identidad pendiente tras un callback de OIDC sin match local (2026-09-02) --
// RequestAccessPage.jsx llama esto para saber a quien mostrar (nombre/email) y si ya existe
// una solicitud PENDING de esta misma identidad (para mostrar el estado en vez del
// formulario). La cookie es httpOnly -- el frontend nunca ve el JWT, solo esta respuesta.
import { desc, eq } from 'drizzle-orm'
import { accessRequest, db } from '../../../server-lib/db/client.js'
import { readPendingCookie } from '../../../server-lib/oidc.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const pending = readPendingCookie(req)
  if (!pending) return res.status(401).json({ error: 'No hay una identidad pendiente.' })

  const [existing] = await db
    .select()
    .from(accessRequest)
    .where(eq(accessRequest.oidcSub, pending.sub))
    .orderBy(desc(accessRequest.requestedAt))
    .limit(1)

  return res.status(200).json({
    email: pending.email,
    name: pending.name || null,
    existingRequest: existing
      ? { status: existing.status, requestedAt: existing.requestedAt }
      : null,
  })
}
