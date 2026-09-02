// Crea la solicitud de acceso via SSO (2026-09-02, apps.mi2.com.mx/stack seccion 7c,
// adaptado -- ver AccessRequest en schema.js). No requiere sesion (la persona todavia no
// tiene una): usa la identidad de la cookie de pendiente que dejo el callback.
import { and, desc, eq } from 'drizzle-orm'
import { accessRequest, db } from '../../../server-lib/db/client.js'
import { postAccessRequestNotice } from '../../../server-lib/mattermost.js'
import { readPendingCookie } from '../../../server-lib/oidc.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const pending = readPendingCookie(req)
  if (!pending) return res.status(401).json({ error: 'No hay una identidad pendiente.' })

  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : null

  const [existingPending] = await db
    .select()
    .from(accessRequest)
    .where(and(eq(accessRequest.oidcSub, pending.sub), eq(accessRequest.status, 'PENDING')))
    .orderBy(desc(accessRequest.requestedAt))
    .limit(1)
  if (existingPending) {
    return res.status(200).json({ status: 'OK', request: existingPending, alreadyPending: true })
  }

  const [created] = await db
    .insert(accessRequest)
    .values({
      oidcSub: pending.sub,
      email: pending.email,
      name: pending.name || null,
      note,
    })
    .returning()

  const text =
    `🔐 **Solicitud de acceso — Centro de Trabajo**\n` +
    `**Usuario:** ${pending.name ? `${pending.name} ` : ''}<${pending.email}>` +
    (note ? `\n**Motivo:** ${note}` : '') +
    `\n\nRevisa y decide en Usuarios > Solicitudes de acceso.`
  postAccessRequestNotice(text) // best-effort, nunca lanza -- ver mattermost.js

  return res.status(201).json({ status: 'OK', request: created, alreadyPending: false })
}
