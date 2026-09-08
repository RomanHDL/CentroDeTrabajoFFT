// Solicitud de acceso LOCAL (2026-09-08, a peticion explicita del usuario -- "que salte un
// mensaje de que no estas registrado... boton de mandar solicitud... me llegue el numero de
// empleado en automatico"): segundo origen posible de AccessRequest, alterno al de SSO
// (api/auth/oidc/request-access.js) -- alguien intento el login local (numero de empleado/
// contraseña) con un numero que no tiene User todavia (ver api/auth/login.js, codigo
// NOT_REGISTERED) y pide acceso desde la misma pantalla, sin pasar por Nextcloud. No
// requiere sesion (la persona no tiene cuenta todavia).
import { and, desc, eq } from 'drizzle-orm'
import { accessRequest, db, user } from '../../server-lib/db/client.js'
import { postAccessRequestNotice } from '../../server-lib/mattermost.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const employeeNumber = typeof req.body?.employeeNumber === 'string' ? req.body.employeeNumber.trim() : ''
  if (!employeeNumber) {
    return res.status(400).json({ error: 'Falta el número de empleado.' })
  }

  // Re-chequeo real del lado del servidor (nunca confiar solo en que el frontend ya vio
  // NOT_REGISTERED antes de llegar aqui) -- si alguien ya se registro mientras tanto, evita
  // una solicitud fantasma para una cuenta que ya existe.
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.employeeNumber, employeeNumber))
    .limit(1)
  if (existingUser) {
    return res.status(409).json({ error: 'Ese número de empleado ya tiene una cuenta registrada.' })
  }

  const [existingPending] = await db
    .select()
    .from(accessRequest)
    .where(
      and(eq(accessRequest.employeeNumber, employeeNumber), eq(accessRequest.status, 'PENDING')),
    )
    .orderBy(desc(accessRequest.requestedAt))
    .limit(1)
  if (existingPending) {
    return res.status(200).json({ status: 'OK', request: existingPending, alreadyPending: true })
  }

  const [created] = await db.insert(accessRequest).values({ employeeNumber }).returning()

  const text =
    `🔐 **Solicitud de acceso — Centro de Trabajo**\n` +
    `**Número de empleado:** ${employeeNumber}\n\n` +
    `Revisa y decide en Usuarios > Solicitudes de acceso.`
  postAccessRequestNotice(text) // best-effort, nunca lanza -- ver mattermost.js

  return res.status(201).json({ status: 'OK', request: created, alreadyPending: false })
}
